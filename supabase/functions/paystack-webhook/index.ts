// Supabase Edge Function: paystack-webhook
// Serves: POST https://<project-ref>.supabase.co/functions/v1/paystack-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

// Helper to verify HMAC-SHA512 signature using Web Crypto API in Deno
async function verifyHmacSha512(secret: string, signature: string, rawBody: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const hashHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex.toLowerCase() === signature.trim().toLowerCase();
  } catch (err) {
    console.error('[paystack-webhook] HMAC verification error:', err);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const paystackSecretKey = (Deno.env.get('PAYSTACK_SECRET_KEY') || '').trim();

    if (!paystackSecretKey) {
      console.error('[paystack-webhook] PAYSTACK_SECRET_KEY missing');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signature = req.headers.get('x-paystack-signature') || '';
    const rawBody = await req.text();

    // 1. Verify webhook signature using HMAC-SHA512
    const isValidSignature = await verifyHmacSha512(paystackSecretKey, signature, rawBody);
    if (!isValidSignature) {
      console.warn('[paystack-webhook] Invalid signature received');
      return new Response(JSON.stringify({ error: 'Invalid webhook signature.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(rawBody);

    // 2. Only process charge.success events
    if (event.event !== 'charge.success') {
      return new Response(JSON.stringify({ status: true, message: 'Event ignored.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = event.data;
    const reference = String(data?.reference || '').trim();

    if (!reference) {
      return new Response(JSON.stringify({ error: 'Missing reference in event data.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Idempotency Check: Was this transaction already processed?
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('reference', reference)
      .eq('status', 'SUCCESS')
      .maybeSingle();

    if (existingTx) {
      console.log(`[paystack-webhook] Reference '${reference}' already processed. Skipping duplicate credit.`);
      return new Response(JSON.stringify({ status: true, message: 'Transaction already credited.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Look up funding request
    const { data: fundingReq } = await supabase
      .from('funding_requests')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (!fundingReq) {
      console.warn(`[paystack-webhook] No funding request found for reference '${reference}'`);
      return new Response(JSON.stringify({ status: true, message: 'No matching funding request.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (fundingReq.status === 'APPROVED') {
      console.log(`[paystack-webhook] Funding request '${reference}' already approved.`);
      return new Response(JSON.stringify({ status: true, message: 'Already approved.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Verify currency and amount
    if (data.currency && data.currency.toUpperCase() !== 'NGN') {
      await supabase
        .from('funding_requests')
        .update({
          status: 'REJECTED',
          admin_note: `Currency mismatch: expected NGN, received ${data.currency}`,
        })
        .eq('reference', reference);

      return new Response(JSON.stringify({ error: 'Currency mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paidAmountNgn = data.amount / 100;
    const expectedAmount = Number(fundingReq.amount);

    if (Math.abs(paidAmountNgn - expectedAmount) > 0.01) {
      await supabase
        .from('funding_requests')
        .update({
          status: 'REJECTED',
          admin_note: `Payment amount mismatch: expected ₦${expectedAmount}, received ₦${paidAmountNgn}`,
        })
        .eq('reference', reference);

      return new Response(JSON.stringify({ error: 'Amount mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Fetch platform settings for credit conversion
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('unit_value_ngn')
      .eq('id', 'settings_main')
      .maybeSingle();

    const unitRate = settings?.unit_value_ngn ? Number(settings.unit_value_ngn) : 200;
    const creditsCredited = Number((expectedAmount / unitRate).toFixed(2));

    // 7. Credit customer wallet
    let { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', fundingReq.user_id)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({
          id: `wal_${fundingReq.user_id}`,
          user_id: fundingReq.user_id,
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

    await supabase
      .from('wallets')
      .update({
        available_balance: newBalance,
        total_deposited: totalDeposited,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', fundingReq.user_id);

    // 8. Insert transaction record
    const feeNgn = data.fees ? data.fees / 100 : 0;
    const newTxnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTxn = {
      id: newTxnId,
      wallet_id: wallet.id,
      user_id: fundingReq.user_id,
      reference,
      type: 'FUNDING',
      amount: expectedAmount,
      fee: feeNgn,
      balance_before: currentBalance,
      balance_after: newBalance,
      status: 'SUCCESS',
      description: `Wallet funded with ${creditsCredited} Credits (₦${expectedAmount.toLocaleString()}) via Paystack (${reference})`,
      metadata: {
        gateway: 'PAYSTACK',
        paystack_id: data.id,
        channel: data.channel,
        card_type: data.authorization?.card_type,
        last4: data.authorization?.last4,
        bank: data.authorization?.bank,
        customer_email: data.customer?.email,
        paid_at: data.paid_at,
        gateway_response: data.gateway_response,
        credits_credited: creditsCredited,
        unit_rate: unitRate,
        source: 'WEBHOOK_EDGE_FUNCTION',
      },
      created_at: new Date().toISOString(),
    };

    await supabase.from('transactions').insert(newTxn);

    // 9. Update funding request
    await supabase
      .from('funding_requests')
      .update({
        status: 'APPROVED',
        reviewed_by: 'PAYSTACK_WEBHOOK_EDGE_FUNCTION',
        reviewed_at: new Date().toISOString(),
        admin_note: `Settled via Paystack Webhook (${data.channel || 'Card'}) on ${data.paid_at || new Date().toISOString()}`,
      })
      .eq('reference', reference);

    // 10. Write notification
    await supabase.from('notifications').insert({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: fundingReq.user_id,
      title: 'Wallet Funded Successfully',
      message: `Your wallet was credited with ${creditsCredited} Credits (₦${expectedAmount.toLocaleString()}) via Paystack.`,
      type: 'WALLET',
      is_read: false,
      link: '/wallet',
      created_at: new Date().toISOString(),
    });

    console.log(`[paystack-webhook] Reference '${reference}' fulfilled. Added ${creditsCredited} Credits to user ${fundingReq.user_id}.`);

    return new Response(JSON.stringify({ status: true, message: 'Payment successfully credited.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[paystack-webhook] Error:', err);
    // Return 200 to prevent Paystack from retrying indefinitely on application crash
    return new Response(JSON.stringify({ status: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
