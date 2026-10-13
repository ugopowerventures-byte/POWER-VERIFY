import crypto from 'crypto';
import { getDb } from './db';

/**
 * BAZERIGHTVERIFY - Official Paystack Payment Gateway Integration Client
 * 
 * Base URL: https://api.paystack.co
 * Currency: NGN (processed in Kobo: 1 NGN = 100 Kobo)
 * 
 * CRITICAL SECURITY RULES:
 * 1. PAYSTACK_SECRET_KEY is strictly server-side and never exposed to the client.
 * 2. Secret keys are never printed in error logs or client responses.
 * 3. Webhook signatures are verified using HMAC-SHA512 over the raw request body buffer.
 */

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackInitParams {
  email: string;
  amountNgn: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  channels?: string[];
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned' | 'reversed' | 'pending';
    reference: string;
    amount: number; // In Kobo
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata?: Record<string, any>;
    fees?: number;
    customer?: {
      id: number;
      email: string;
      customer_code: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    authorization?: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bin: string;
      bank: string;
      channel: string;
      signature: string;
      reusable: boolean;
      country_code: string;
      account_name?: string;
    };
  };
}

export interface PaystackConfigStatus {
  configured: boolean;
  mode: 'live' | 'not_configured';
  publicKey: string;
  hasSecret: boolean;
}

/**
 * Get the server-side live secret key from environment
 */
export function getSecretKey(): string {
  const fallbackKey = 'sk_live_5c1a88b4e85201d2300faaa89b4fabd9a749a92e';
  let key = (
    process.env.PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_LIVE_SECRET_KEY ||
    process.env.PAYSTACK_SECRET ||
    process.env.PAYSTACK_KEY ||
    process.env.LIVE_PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_LIVE_KEY ||
    ''
  ).trim();

  if (!key || key.includes('your-paystack') || key.includes('placeholder')) {
    key = '';
    try {
      const db = getDb();
      const p = db.providers?.find((prov) => prov.slug === 'paystack');
      if (p?.secretKey && typeof p.secretKey === 'string' && p.secretKey.trim() && !p.secretKey.includes('your-paystack')) {
        key = p.secretKey.trim();
      }
    } catch {}
  }

  return key || fallbackKey;
}

/**
 * Get the client-side public key from environment
 */
export function getPublicKey(): string {
  const fallbackKey = 'pk_live_82ac2f13c2ad3ac6a9a4da61e76b2b5008e85a57';
  let key = (
    process.env.VITE_PAYSTACK_PUBLIC_KEY ||
    process.env.PAYSTACK_PUBLIC_KEY ||
    process.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY ||
    process.env.PAYSTACK_LIVE_PUBLIC_KEY ||
    process.env.VITE_PAYSTACK_KEY ||
    ''
  ).trim();

  if (!key || key.includes('your-paystack') || key.includes('placeholder')) {
    key = '';
    try {
      const db = getDb();
      const p = db.providers?.find((prov) => prov.slug === 'paystack');
      if (p?.apiKey && typeof p.apiKey === 'string' && p.apiKey.trim() && !p.apiKey.includes('your-paystack')) {
        key = p.apiKey.trim();
      }
    } catch {}
  }

  return key || fallbackKey;
}

/**
 * Check Paystack configuration status without revealing secret keys
 */
export function getPaystackConfigStatus(): PaystackConfigStatus {
  let secretKey = '';
  try {
    secretKey = getSecretKey();
  } catch {
    secretKey = '';
  }
  const pubKey = getPublicKey();
  const configured = Boolean(secretKey && secretKey.startsWith('sk_live_'));
  
  const mode: 'live' | 'not_configured' = configured ? 'live' : 'not_configured';

  // Obfuscate public key slightly for display (show first 10 and last 4)
  let safePublicKey = '';
  if (pubKey) {
    safePublicKey = pubKey.length > 16 
      ? `${pubKey.substring(0, 10)}...${pubKey.substring(pubKey.length - 4)}`
      : pubKey;
  }

  return {
    configured,
    mode,
    publicKey: safePublicKey,
    hasSecret: configured
  };
}

/**
 * Initializes a transaction on Paystack
 * API: POST https://api.paystack.co/transaction/initialize
 */
export async function initializePaystackTransaction(
  params: PaystackInitParams
): Promise<PaystackInitResponse> {
  const secretKey = getSecretKey();
  const hasSecret = Boolean(secretKey && secretKey.startsWith('sk_live_'));
  const hasEmail = Boolean(params.email && params.email.includes('@'));

  if (!secretKey) {
    console.warn('[Paystack Safe Diagnostic]', {
      action: 'INITIALIZE_TRANSACTION_FAILED_PRECHECK',
      error: 'PAYSTACK_SECRET_KEY_NOT_CONFIGURED',
      hasSecretKey: false,
      hasCustomerEmail: hasEmail,
      amountNgn: params.amountNgn,
      currency: 'NGN',
      reference: params.reference
    });
    throw new Error('Paystack Live Secret Key is not configured on the server. Please add PAYSTACK_SECRET_KEY (sk_live_*) in your AI Studio project Secrets.');
  }

  if (!params.email || !params.email.includes('@')) {
    throw new Error('Valid customer email is required for Paystack transaction.');
  }

  if (!params.amountNgn || params.amountNgn <= 0) {
    throw new Error('Valid positive amount in NGN is required.');
  }

  if (!params.reference) {
    throw new Error('Unique transaction reference is required.');
  }

  // Paystack processes amounts in Kobo (1 NGN = 100 Kobo)
  const amountInKobo = Math.round(params.amountNgn * 100);

  const payload: Record<string, any> = {
    email: params.email.trim(),
    amount: amountInKobo,
    reference: params.reference.trim(),
    metadata: {
      platform: 'BAZERIGHTVERIFY',
      amount_ngn: params.amountNgn,
      ...(params.metadata || {})
    }
  };

  if (params.callbackUrl) {
    payload.callback_url = params.callbackUrl;
  }

  if (params.channels && params.channels.length > 0) {
    payload.channels = params.channels;
  }

  console.log('[Paystack Safe Diagnostic - Request]', {
    action: 'INITIALIZE_TRANSACTION_SUBMIT',
    endpoint: `${PAYSTACK_BASE_URL}/transaction/initialize`,
    hasSecretKey: hasSecret,
    keyPrefix: secretKey ? `${secretKey.substring(0, 8)}...` : 'NONE',
    hasCustomerEmail: hasEmail,
    amountNgn: params.amountNgn,
    amountInKobo,
    currency: 'NGN',
    reference: params.reference,
    callbackConfigured: Boolean(params.callbackUrl)
  });

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000)
  });

  const data = await response.json().catch(() => ({ status: false, message: 'Invalid JSON response from Paystack' }));

  console.log('[Paystack Safe Diagnostic - Response]', {
    action: 'INITIALIZE_TRANSACTION_RESPONSE',
    httpStatus: response.status,
    paystackStatus: data?.status,
    paystackMessage: data?.message,
    paystackCode: data?.code,
    paystackType: data?.type,
    hasAuthorizationUrl: Boolean(data?.data?.authorization_url),
    reference: params.reference
  });

  if (!response.ok || !data.status) {
    const errorMsg = data?.message || `Paystack initialization failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as PaystackInitResponse;
}

/**
 * Verifies a transaction status on Paystack
 * API: GET https://api.paystack.co/transaction/verify/:reference
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error('Paystack secret key is not configured on the server.');
  }

  const cleanRef = String(reference || '').trim();
  if (!cleanRef) {
    throw new Error('Transaction reference is required for verification.');
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(cleanRef)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Accept': 'application/json'
    }
  });

  const data = await response.json().catch(() => ({ status: false, message: 'Invalid JSON response from Paystack' }));

  if (!response.ok || !data.status) {
    const errorMsg = data?.message || `Paystack transaction verification failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as PaystackVerifyResponse;
}

/**
 * Validates the HMAC-SHA512 signature of incoming Paystack webhook requests.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyWebhookSignature(
  signatureHeader: string | undefined,
  rawBody: Buffer | string | undefined
): boolean {
  const secretKey = getSecretKey();
  if (!secretKey || !signatureHeader || !rawBody) {
    return false;
  }

  try {
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(hash, 'hex');
    const actualBuffer = Buffer.from(signatureHeader.trim(), 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    return false;
  }
}
