import 'dotenv/config';
import crypto from 'crypto';
import https from 'https';

/**
 * BAZERIGHTVERIFY - Official Sendchamp SMS & OTP Integration Client
 * Base URL: https://api.sendchamp.com/api/v1 (or configured via SENDCHAMP_BASE_URL)
 *
 * Security Requirements:
 * 1. SENDCHAMP_API_KEY is strictly server-side and never exposed to the client.
 * 2. Normalizes Nigerian phone numbers (080... or +234... -> 234...).
 * 3. 6-digit numeric OTP, 10-minute expiry, 60s resend cooldown.
 * 4. Never logs or leaks API keys or plain OTPs.
 */

async function sendchampRequest(endpoint: string, postData?: any): Promise<{ statusCode: number; data: any }> {
  const baseUrl = getSendchampBaseUrl();
  const fullUrl = new URL(endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`);
  const apiKey = getSendchampApiKey();
  const bodyString = postData ? JSON.stringify(postData) : null;

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || 443,
      path: `${fullUrl.pathname}${fullUrl.search}`,
      method: postData ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        ...(bodyString ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyString)
        } : {})
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = { rawResponse: raw };
        }
        resolve({ statusCode: res.statusCode || 500, data: parsed });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Sendchamp request timed out after 15 seconds.'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

export interface SendchampConfigStatus {
  configured: boolean;
  baseUrl: string;
}

export interface SendchampOtpSession {
  userId: string;
  phone: string;
  reference?: string;
  pinHash?: string;
  salt?: string;
  mode: 'sendchamp_api' | 'crypto_secure';
  expiresAt: number;
  attempts: number;
  verified: boolean;
  lastSentAt: number;
}

// In-memory server-authoritative store for active onboarding OTP sessions
const onboardingOtpSessions = new Map<string, SendchampOtpSession>();

/**
 * Retrieve Sendchamp Base URL from environment
 */
export function getSendchampBaseUrl(): string {
  const envUrl = (process.env.SENDCHAMP_BASE_URL || '').trim().replace(/\/$/, '');
  return envUrl || 'https://api.sendchamp.com/api/v1';
}

/**
 * Retrieve and sanitize Sendchamp API key from environment
 */
export function getSendchampApiKey(): string {
  let key = (process.env.SENDCHAMP_API_KEY || '').trim();
  key = key.replace(/^["']|["']$/g, '');
  key = key.replace(/[.;,]+$/, '');
  return key.trim();
}

/**
 * Check Sendchamp configuration status without leaking keys
 */
export function getSendchampConfigStatus(): SendchampConfigStatus {
  const key = getSendchampApiKey();
  return {
    configured: Boolean(key && key.length > 5),
    baseUrl: getSendchampBaseUrl()
  };
}

/**
 * Normalize Nigerian phone numbers:
 * 08012345678 -> 2348012345678
 * +2348012345678 -> 2348012345678
 * 2348012345678 -> 2348012345678
 * 8012345678 -> 2348012345678
 */
export function normalizeNigerianPhone(phone: string): {
  valid: boolean;
  normalized: string;
  displayFormatted: string;
  error?: string;
} {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, normalized: '', displayFormatted: '', error: 'Phone number is required.' };
  }

  // Strip all non-numeric characters except leading '+'
  let clean = phone.trim().replace(/[^\d+]/g, '');

  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  }

  // Handle standard Nigerian local prefix: 070, 080, 081, 090, 091, 071, etc.
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '234' + clean.substring(1);
  } else if (!clean.startsWith('234') && clean.length === 10) {
    clean = '234' + clean;
  }

  // Validate Nigerian number: 234 + [7, 8, 9] + 9 more digits
  const isNigerian = /^234(7|8|9)\d{9}$/.test(clean);
  const isInternational = /^\d{11,15}$/.test(clean);

  if (!isNigerian && !isInternational) {
    return {
      valid: false,
      normalized: clean,
      displayFormatted: phone,
      error: 'Please enter a valid Nigerian mobile phone number (e.g. 08012345678 or +2348012345678).'
    };
  }

  const masked = clean.length >= 8
    ? `+${clean.slice(0, 3)} ${clean.slice(3, 6)}****${clean.slice(-3)}`
    : `+${clean}`;

  return {
    valid: true,
    normalized: clean,
    displayFormatted: masked
  };
}

/**
 * Generate cryptographically secure 6-digit numeric OTP
 */
function generateSecureOtp(): string {
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * Send 6-digit SMS OTP via Sendchamp Verification API
 */
export async function sendSendchampOtp(
  userId: string,
  rawPhone: string
): Promise<{
  success: boolean;
  message: string;
  normalizedPhone?: string;
  displayPhone?: string;
  cooldownSeconds?: number;
  unconfigured?: boolean;
}> {
  const apiKey = getSendchampApiKey();
  if (!apiKey) {
    return {
      success: false,
      unconfigured: true,
      message: 'Sendchamp SMS gateway is not configured on the server. Please set SENDCHAMP_API_KEY in the environment secrets.'
    };
  }

  const phoneCheck = normalizeNigerianPhone(rawPhone);
  if (!phoneCheck.valid) {
    return {
      success: false,
      message: phoneCheck.error || 'Invalid Nigerian phone number format.'
    };
  }

  const normalizedPhone = phoneCheck.normalized;

  // Rate Limiting / Resend Protection: 60-second cooldown
  const existing = onboardingOtpSessions.get(userId);
  if (existing && existing.lastSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - existing.lastSentAt) / 1000);
    const cooldownPeriod = 60;
    if (elapsedSeconds < cooldownPeriod) {
      const remaining = cooldownPeriod - elapsedSeconds;
      return {
        success: false,
        cooldownSeconds: remaining,
        message: `Please wait ${remaining} seconds before requesting a new OTP.`
      };
    }
  }

  const baseUrl = getSendchampBaseUrl();

  // Attempt 1: Sendchamp Verification API (POST /verification/create)
  try {
    const { statusCode, data: resData } = await sendchampRequest('/verification/create', {
      channel: 'sms',
      sender_name: 'Sendchamp',
      token_type: 'numeric',
      token_length: 6,
      expiration_time: 10, // 10 minutes
      customer_mobile_number: normalizedPhone
    });

    const isSuccess = statusCode >= 200 && statusCode < 300 && (
      resData?.status === 'success' ||
      resData?.code === 200 ||
      resData?.code === 201 ||
      Boolean(resData?.data?.reference || resData?.data?.business_id)
    );

    if (isSuccess) {
      const reference = resData?.data?.reference || resData?.data?.verification_reference || `sc_${Date.now()}`;
      onboardingOtpSessions.set(userId, {
        userId,
        phone: normalizedPhone,
        reference,
        mode: 'sendchamp_api',
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
        verified: false,
        lastSentAt: Date.now()
      });

      return {
        success: true,
        message: 'A 6-digit verification code has been sent via SMS to your phone number.',
        normalizedPhone,
        displayPhone: phoneCheck.displayFormatted,
        cooldownSeconds: 60
      };
    }

    // If Sendchamp returned an explicit error message (such as low balance)
    const sendchampMsg = resData?.message || resData?.errors?.[0]?.message || 'Sendchamp verification dispatch failed';
    console.warn('[Sendchamp OTP] Verification API response non-200:', statusCode, sendchampMsg);

    // If Sendchamp verification/create endpoint returned error, attempt direct SMS fallback via Sendchamp /sms/send
    const fallbackOtp = generateSecureOtp();
    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = crypto.createHash('sha256').update(fallbackOtp + salt).digest('hex');

    const { statusCode: smsStatusCode, data: smsData } = await sendchampRequest('/sms/send', {
      to: [normalizedPhone],
      message: `Your BAZERIGHTVERIFY onboarding verification code is ${fallbackOtp}. Valid for 10 minutes. Do not share.`,
      sender_name: 'Sendchamp',
      route: 'dnd'
    });

    if (smsStatusCode >= 200 && smsStatusCode < 300 && (smsData?.status === 'success' || smsData?.code === 200)) {
      onboardingOtpSessions.set(userId, {
        userId,
        phone: normalizedPhone,
        pinHash,
        salt,
        mode: 'crypto_secure',
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
        verified: false,
        lastSentAt: Date.now()
      });

      return {
        success: true,
        message: 'A 6-digit verification code has been sent via SMS to your phone number.',
        normalizedPhone,
        displayPhone: phoneCheck.displayFormatted,
        cooldownSeconds: 60
      };
    }

    return {
      success: false,
      message: `Failed to deliver SMS OTP via Sendchamp: ${sendchampMsg}. Please verify your phone number or try again shortly.`
    };
  } catch (err: any) {
    console.error('[Sendchamp OTP] Request exception:', err.message || err);
    return {
      success: false,
      message: `SMS gateway error: ${err.message || 'Unable to connect to Sendchamp service'}. Please try again.`
    };
  }
}

/**
 * Verify received 6-digit OTP with Sendchamp API
 */
export async function verifySendchampOtp(
  userId: string,
  rawPhone: string,
  otpCode: string
): Promise<{
  success: boolean;
  verified: boolean;
  message: string;
  normalizedPhone?: string;
}> {
  const apiKey = getSendchampApiKey();
  if (!apiKey) {
    return {
      success: false,
      verified: false,
      message: 'Sendchamp SMS gateway is not configured on the server.'
    };
  }

  const phoneCheck = normalizeNigerianPhone(rawPhone);
  if (!phoneCheck.valid) {
    return {
      success: false,
      verified: false,
      message: 'Invalid phone number format.'
    };
  }

  const normalizedPhone = phoneCheck.normalized;
  const cleanOtp = String(otpCode || '').replace(/\D/g, '').trim();

  if (cleanOtp.length !== 6) {
    return {
      success: false,
      verified: false,
      message: 'OTP must be an exact 6-digit numerical code.'
    };
  }

  const session = onboardingOtpSessions.get(userId);
  if (!session) {
    return {
      success: false,
      verified: false,
      message: 'No active OTP verification session found. Please click "Send OTP" to receive a verification code.'
    };
  }

  if (session.phone !== normalizedPhone) {
    return {
      success: false,
      verified: false,
      message: 'The submitted phone number does not match the number that requested the OTP code.'
    };
  }

  if (Date.now() > session.expiresAt) {
    onboardingOtpSessions.delete(userId);
    return {
      success: false,
      verified: false,
      message: 'The verification code has expired (10-minute limit). Please request a fresh OTP.'
    };
  }

  session.attempts += 1;

  const baseUrl = getSendchampBaseUrl();

  // Mode 1: Sendchamp Verification API Confirmation
  if (session.mode === 'sendchamp_api' && session.reference) {
    try {
      const { statusCode, data: verifyData } = await sendchampRequest('/verification/confirm', {
        verification_reference: session.reference,
        verification_code: cleanOtp
      });

      const isVerified = Boolean(
        (statusCode >= 200 && statusCode < 300 && (verifyData?.status === 'success' || verifyData?.code === 200)) ||
        verifyData?.data?.status === 'verified'
      );

      if (isVerified) {
        session.verified = true;
        onboardingOtpSessions.set(userId, session);
        return {
          success: true,
          verified: true,
          normalizedPhone,
          message: 'Phone number verified successfully via Sendchamp SMS OTP!'
        };
      }

      const failMsg = verifyData?.message || 'Incorrect 6-digit OTP code.';
      return {
        success: false,
        verified: false,
        message: failMsg
      };
    } catch (err: any) {
      console.warn('[Sendchamp OTP] Verification confirm exception:', err.message || err);
    }
  }

  // Mode 2: Direct Server Cryptographic Salted Hash Verification
  if (session.pinHash && session.salt) {
    const inputHash = crypto.createHash('sha256').update(cleanOtp + session.salt).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(session.pinHash))) {
      session.verified = true;
      onboardingOtpSessions.set(userId, session);
      return {
        success: true,
        verified: true,
        normalizedPhone,
        message: 'Phone number verified successfully via Sendchamp SMS OTP!'
      };
    }

    return {
      success: false,
      verified: false,
      message: 'Incorrect 6-digit OTP code.'
    };
  }

  return {
    success: false,
    verified: false,
    message: 'Verification failed. Please request a fresh OTP code.'
  };
}

/**
 * Server-authoritative check: Has phone number been verified by this user?
 */
export function isPhoneVerifiedForUser(userId: string, rawPhone: string): boolean {
  const phoneCheck = normalizeNigerianPhone(rawPhone);
  if (!phoneCheck.valid) return false;

  const session = onboardingOtpSessions.get(userId);
  if (session && session.verified && session.phone === phoneCheck.normalized) {
    if (Date.now() - session.lastSentAt <= 24 * 60 * 60 * 1000) {
      return true;
    }
  }

  // Also check database user record for persistent state across restarts and browser page reloads
  try {
    const { getDb } = require('./db');
    const db = getDb();
    const user = db.users?.find((u: any) => u.id === userId);
    if (user && user.phone1Verified && user.phone1VerifiedNumber) {
      const userPhoneCheck = normalizeNigerianPhone(user.phone1VerifiedNumber);
      if (userPhoneCheck.valid && userPhoneCheck.normalized === phoneCheck.normalized) {
        return true;
      }
    }
  } catch {}

  return false;
}

/**
 * Reset phone verification status if user changes phone number
 */
export function resetPhoneVerification(userId: string) {
  onboardingOtpSessions.delete(userId);
  try {
    const { getDb, saveDb } = require('./db');
    const db = getDb();
    const user = db.users?.find((u: any) => u.id === userId);
    if (user) {
      user.phone1Verified = false;
      user.phone1VerifiedNumber = undefined;
      saveDb();
    }
  } catch {}
}
