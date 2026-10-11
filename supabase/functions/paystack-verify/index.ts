// Supabase Edge Function: paystack-verify
// Serves: GET or POST https://<project-ref>.supabase.co/functions/v1/paystack-verify

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const paystackSecretKey = (Deno.env.get('PAYSTACK_SECRET_KEY') || '').trim();

    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Paystack secret key is not configured in Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate user from Bearer token
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Authorization token is required.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extract reference from URL query params or request body
    const url = new URL(req.url);
    let reference = url.searchParams.get('reference') || url.searchParams.get('trxref') || '';

    if (!reference && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      reference = body.reference || body.trxref || '';
    }

    const cleanRef = String(reference || '').trim();
    if (!cleanRef) {
      return new Response(
        JSON.stringify({ error: 'Transaction reference is required for verification.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check for existing successful transaction (Idempotency Protection)
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', cleanRef)
      .eq('status', 'SUCCESS')
      .maybeSingle();

    if (existingTx) {
      // Validate customer ownership
      if (existingTx.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'This payment transaction belongs to another account.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          alreadyProcessed: true,
          message: 'Transaction has already been verified and credited.',
          wallet,
          transaction: existingTx,
          amountNgn: existingTx.amount,
          creditsCredited: existingTx.metadata?.credits_credited || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Fetch the funding request record
    const { data: fundingReq } = await supabase
      .from('funding_requests')
      .select('*')
      .eq('reference', cleanRef)
      .maybeSingle();

    if (!fundingReq) {
      return new Response(
        JSON.stringify({ error: `No funding request found for reference '${cleanRef}'.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Customer ownership verification
    if (fundingReq.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'This payment transaction belongs to another account.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already approved, return success without double crediting
    if (fundingReq.status === 'APPROVED') {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          alreadyProcessed: true,
          message: 'Funding request has already been approved and credited.',
          wallet,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Query Paystack Live API for authoritative status
    const paystackRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(cleanRef)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Accept': 'application/json',
      },
    });

    const paystackData = await paystackRes.json().catch(() => ({ status: false, message: 'Invalid response from Paystack' }));

    if (!paystackRes.ok || !paystackData.status || !paystackData.data) {
      return new Response(
        JSON.stringify({ error: paystackData.message || 'Payment verification failed on Paystack Live.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const txData = paystackData.data;

    // 6. Validate status
    if (txData.status !== 'success') {
      await supabase
        .from('funding_requests')
        .update({
          status: 'REJECTED',
          admin_note: `Paystack status was '${txData.status}' (${txData.gateway_response || 'Unsuccessful'})`,
        })
        .eq('reference', cleanRef);

      return new Response(
        JSON.stringify({
          error: `Paystack reported payment was not successful (Status: ${txData.status}). Wallet was not credited.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Validate currency
    if (txData.currency && txData.currency.toUpperCase() !== 'NGN') {
      await supabase
        .from('funding_requests')
        .update({
          status: 'REJECTED',
          admin_note: `Currency mismatch: expected NGN, received ${txData.currency}`,
        })
        .eq('reference', cleanRef);

      return new Response(
        JSON.stringify({ error: `Currency mismatch: Expected NGN, but Paystack processed ${txData.currency}.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Validate amount (Paystack amount is in Kobo: 1 NGN = 100 Kobo)
    const paidAmountNgn = txData.amount / 100;
    const expectedAmount = Number(fundingReq.amount);

    if (Math.abs(paidAmountNgn - expectedAmount) > 0.01) {
      await supabase
        .from('funding_requests')
        .update({
          status: 'REJECTED',
          admin_note: `Amount mismatch: expected ₦${expectedAmount}, received ₦${paidAmountNgn}`,
        })
        .eq('reference', cleanRef);

      return new Response(
        JSON.stringify({
          error: `Amount mismatch: Expected ₦${expectedAmount.toLocaleString()}, but Paystack received ₦${paidAmountNgn.toLocaleString()}. Wallet was not credited.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Fetch platform settings for credit conversion
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('unit_value_ngn')
      .eq('id', 'settings_main')
      .maybeSingle();

    const unitRate = settings?.unit_value_ngn ? Number(settings.unit_value_ngn) : 200;
    const creditsCredited = Number((expectedAmount / unitRate).toFixed(2));

    // 10. Fetch and update customer wallet
    let { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!wallet) {
      // Auto-create if missing
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({
          id: `wal_${user.id}`,
          user_id: user.id,
          available_balance: 0,
          pending_balance: 0,
          total_deposited: 0,
          total_spent: 0,
        })
        .select()
        .single();
      wallet = newWallet;
    }

    const currentBalance = Number(wallet?.available_balance || 0);
    const newBalance = currentBalance + expectedAmount;
    const totalDeposited = Number(wallet?.total_deposited || 0) + expectedAmount;

    // Update wallet balance in Supabase
    await supabase
      .from('wallets')
      .update({
        available_balance: newBalance,
        total_deposited: totalDeposited,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // 11. Create transaction record
    const feeNgn = txData.fees ? txData.fees / 100 : 0;
    const newTxnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTxn = {
      id: newTxnId,
      wallet_id: wallet.id,
      user_id: user.id,
      reference: cleanRef,
      type: 'FUNDING',
      amount: expectedAmount,
      fee: feeNgn,
      balance_before: currentBalance,
      balance_after: newBalance,
      status: 'SUCCESS',
      description: `Wallet funded with ${creditsCredited} Credits (₦${expectedAmount.toLocaleString()}) via Paystack (${cleanRef})`,
      metadata: {
        gateway: 'PAYSTACK',
        paystack_id: txData.id,
        channel: txData.channel,
        card_type: txData.authorization?.card_type,
        last4: txData.authorization?.last4,
        bank: txData.authorization?.bank,
        customer_email: txData.customer?.email,
        paid_at: txData.paid_at,
        gateway_response: txData.gateway_response,
        credits_credited: creditsCredited,
        unit_rate: unitRate,
        source: 'VERIFY_EDGE_FUNCTION',
      },
      created_at: new Date().toISOString(),
    };

    await supabase.from('transactions').insert(newTxn);

    // 12. Mark funding request as APPROVED
    await supabase
      .from('funding_requests')
      .update({
        status: 'APPROVED',
        reviewed_by: 'PAYSTACK_VERIFY_EDGE_FUNCTION',
        reviewed_at: new Date().toISOString(),
        admin_note: `Settled via Paystack (${txData.channel || 'Card'}) on ${txData.paid_at || new Date().toISOString()}`,
      })
      .eq('reference', cleanRef);

    // 13. Create in-app notification
    await supabase.from('notifications').insert({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      title: 'Wallet Funded Successfully',
      message: `Your wallet was credited with ${creditsCredited} Credits (₦${expectedAmount.toLocaleString()}) via Paystack.`,
      type: 'WALLET',
      is_read: false,
      link: '/wallet',
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        alreadyProcessed: false,
        message: `Successfully credited ${creditsCredited} Credits (₦${expectedAmount.toLocaleString()}) to your wallet.`,
        wallet: {
          ...wallet,
          available_balance: newBalance,
          total_deposited: totalDeposited,
        },
        transaction: newTxn,
        creditsCredited,
        amountNgn: expectedAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[paystack-verify] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error during verification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
