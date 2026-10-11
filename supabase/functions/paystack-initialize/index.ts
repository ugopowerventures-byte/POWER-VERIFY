// Supabase Edge Function: paystack-initialize
// Serves: POST https://<project-ref>.supabase.co/functions/v1/paystack-initialize

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

serve(async (req: Request) => {
  // Handle CORS preflight
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

    // 2. Parse and validate body
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const callbackUrl = body.callbackUrl || body.callback_url;

    if (!amount || isNaN(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid funding amount in NGN.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch platform settings for limits and credit rate (₦200 = 1 Credit)
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('unit_value_ngn, min_wallet_funding, max_wallet_funding')
      .eq('id', 'settings_main')
      .maybeSingle();

    const unitRate = settings?.unit_value_ngn ? Number(settings.unit_value_ngn) : 200;
    const minFunding = settings?.min_wallet_funding ? Number(settings.min_wallet_funding) : 1000;
    const maxFunding = settings?.max_wallet_funding ? Number(settings.max_wallet_funding) : 1000000;

    if (amount < minFunding) {
      const minCredits = Number((minFunding / unitRate).toFixed(1));
      return new Response(
        JSON.stringify({ error: `Minimum wallet funding is ₦${minFunding.toLocaleString()} (${minCredits} Credits).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount > maxFunding) {
      return new Response(
        JSON.stringify({ error: `Maximum wallet funding per transaction is ₦${maxFunding.toLocaleString()}.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calculatedCredits = Number((amount / unitRate).toFixed(2));

    // 4. Generate unique transaction reference
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    const reference = `PSTK-${Date.now()}-${randomHex}`;

    // 5. Fetch user profile for name
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    const userEmail = profile?.email || user.email || '';
    const userName = profile?.full_name || 'UGOPAWAVERIFY User';

    // 6. Record pending funding request in Supabase
    const { error: insertError } = await supabase
      .from('funding_requests')
      .insert({
        id: `fnd_${Date.now()}_${randomHex.toLowerCase()}`,
        user_id: user.id,
        user_name: userName,
        user_email: userEmail,
        reference,
        amount,
        method: 'CARD',
        status: 'PENDING',
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[paystack-initialize] Supabase insert error:', insertError);
    }

    // 7. Initialize transaction with Paystack Live API (amount in Kobo: 1 NGN = 100 Kobo)
    const amountInKobo = Math.round(amount * 100);
    const paystackPayload: Record<string, any> = {
      email: userEmail,
      amount: amountInKobo,
      reference,
      metadata: {
        platform: 'UGOPAWAVERIFY',
        user_id: user.id,
        user_name: userName,
        user_email: userEmail,
        amount_ngn: amount,
        credits: calculatedCredits,
        unit_rate: unitRate,
      },
    };

    if (callbackUrl) {
      paystackPayload.callback_url = callbackUrl;
    }

    const paystackRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      // Mark as REJECTED in funding_requests
      await supabase
        .from('funding_requests')
        .update({
          status: 'REJECTED',
          admin_note: `Paystack Live initialization failed: ${paystackData.message || paystackRes.status}`,
        })
        .eq('reference', reference);

      return new Response(
        JSON.stringify({ error: paystackData.message || 'Paystack initialization failed.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        authorizationUrl: paystackData.data?.authorization_url,
        accessCode: paystackData.data?.access_code,
        amount,
        credits: calculatedCredits,
        unitRate,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[paystack-initialize] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
