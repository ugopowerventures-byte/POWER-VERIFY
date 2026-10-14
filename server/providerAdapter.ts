import { getDb, logAudit } from './db';
import { VerificationProvider, ApiCallState, ApiRequestStatus } from './types';

export const DEFAULT_API_TIMEOUT_MS = Number(process.env.API_REQUEST_TIMEOUT_MS) || 120000; // 2 minutes (120,000 ms)

export function getServiceTimeoutMs(serviceCode?: string): number {
  if (process.env.API_REQUEST_TIMEOUT_MS) {
    const envVal = Number(process.env.API_REQUEST_TIMEOUT_MS);
    if (!isNaN(envVal) && envVal > 0) return envVal;
  }
  try {
    const db = getDb();
    if (db.settings?.apiTimeoutMs && Number(db.settings.apiTimeoutMs) > 0) {
      return Number(db.settings.apiTimeoutMs);
    }
    if (serviceCode) {
      const srv = db.services?.find(s => s.code.toUpperCase() === serviceCode.toUpperCase());
      if ((srv as any)?.timeoutMs && Number((srv as any).timeoutMs) > 0) {
        return Number((srv as any).timeoutMs);
      }
    }
  } catch {}
  return DEFAULT_API_TIMEOUT_MS;
}

export function sanitizeProviderResponse(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    const cloned = JSON.parse(JSON.stringify(obj));
    const mask = (target: any) => {
      if (!target || typeof target !== 'object') return;
      for (const k of Object.keys(target)) {
        if (/api_?key|secret|token|password|authorization|auth_header|bearer/i.test(k)) {
          target[k] = '[REDACTED]';
        } else if (typeof target[k] === 'object') {
          mask(target[k]);
        }
      }
    };
    mask(cloned);
    return cloned;
  } catch {
    return null;
  }
}

export interface ProviderResult<T = any> {
  success: boolean;
  status?: ApiRequestStatus;
  message?: string;
  data?: T | null;
  providerResponse?: any;
  providerName: string;
  unconfigured?: boolean;
  rawResponse?: any;
  apiCallState?: ApiCallState;
  apiCalled?: boolean;
  apiResponseReceived?: boolean;
  rawHttpStatus?: number;
  durationMs?: number;
}

export interface CanonicalNinVerificationResult {
  verified: boolean;
  firstName: string;
  middleName: string;
  surname: string;
  fullName: string;
  dateOfBirth: string;
  photoUrl: string | null;
  nin: string;
  phone: string | null;
  address: string | null;
  gender?: string | null;
  trackingId?: string | null;
  stateOfOrigin?: string | null;
  lgaOfOrigin?: string | null;
  telecomNumber?: string | null;
  residenceAddress?: string | null;
  status?: string;
  rawResponse: any;
}

export interface VerificationProviderAdapter {
  verifyNIN(nin: string, extras?: Record<string, any>): Promise<ProviderResult>;
  verifyBVN(bvn: string, extras?: Record<string, any>): Promise<ProviderResult>;
  verifyPhone(phone: string, extras?: Record<string, any>): Promise<ProviderResult>;
  verifyNinPhoneSearch(searchData: Record<string, any>): Promise<ProviderResult>;
  verifyNinValidation(nin: string, trackingId?: string): Promise<ProviderResult>;
  lookupIdentity(query: string, extras?: Record<string, any>): Promise<ProviderResult>;
  verifyDriversLicense(licenseNumber: string, dob: string): Promise<ProviderResult>;
  testConnection(targetProviderIdOrSlug?: string): Promise<{ success: boolean; message: string; latencyMs?: number }>;
}

export function getVeripineBaseUrl(provider?: any): string {
  let url = '';
  if (provider?.slug === 'veripine' && provider?.baseUrl && typeof provider.baseUrl === 'string' && provider.baseUrl.startsWith('http')) {
    url = provider.baseUrl;
  }
  if (!url) {
    try {
      const db = getDb();
      const vProv = db.providers.find(p => p.slug === 'veripine');
      if (vProv?.baseUrl && typeof vProv.baseUrl === 'string' && vProv.baseUrl.startsWith('http')) {
        url = vProv.baseUrl;
      }
    } catch {}
  }
  if (!url) {
    const envUrl = process.env.VERIPINE_BASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
      url = envUrl;
    }
  }
  if (!url) {
    url = 'https://veripine.com/api';
  }
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

export function getVeripineApiKey(provider?: any): string {
  if (provider?.slug === 'veripine') {
    const key = provider.apiKey || provider.secretKey;
    if (key && typeof key === 'string' && key.trim()) return key.trim();
  }
  try {
    const db = getDb();
    const vProv = db.providers.find(p => p.slug === 'veripine');
    const key = vProv?.apiKey || vProv?.secretKey;
    if (key && typeof key === 'string' && key.trim()) return key.trim();
  } catch {}
  const envKey = process.env.VERIPINE_SECRET_KEY || process.env.VERIPINE_API_KEY || (process.env.VERIPINE_BASE_URL && !process.env.VERIPINE_BASE_URL.startsWith('http') ? process.env.VERIPINE_BASE_URL : '') || '';
  return typeof envKey === 'string' ? envKey.trim() : '';
}

export function getNinjaBaseUrl(provider?: any): string {
  // If provider has custom baseUrl, ensure it is an API host, not a web login portal URL (e.g. /login)
  const candidateUrls = [
    provider?.baseUrl,
    (() => { try { return getDb().providers.find(p => p.slug === 'ninja')?.baseUrl; } catch { return null; } })(),
    process.env.NINJA_BASE_URL
  ];

  for (const url of candidateUrls) {
    if (url && typeof url === 'string' && url.startsWith('http')) {
      const clean = url.replace(/\/+$/, '').replace(/\/login\/?$/, '');
      if (clean && !clean.endsWith('.ng') && !clean.endsWith('/login')) {
        return clean;
      }
    }
  }

  return 'https://api.ninja.boucloud.io';
}

export function getNinjaApiKey(provider?: any): string {
  if (provider?.slug === 'ninja') {
    const key = provider.secretKey || provider.apiKey;
    if (key && typeof key === 'string' && key.trim()) return key.trim();
  }
  try {
    const db = getDb();
    const nProv = db.providers.find(p => p.slug === 'ninja');
    const key = nProv?.secretKey || nProv?.apiKey;
    if (key && typeof key === 'string' && key.trim()) return key.trim();
  } catch {}
  const key = process.env.NINJA_SECRET_KEY || process.env.NINJA_PUBLIC_KEY || process.env.NINJA_API_KEY || '';
  return typeof key === 'string' ? key.trim() : '';
}

export function getNinjaSecretKey(provider?: any): string {
  if (provider?.slug === 'ninja') {
    const key = provider.secretKey || provider.apiKey;
    if (key && typeof key === 'string' && key.trim()) return key.trim();
  }
  try {
    const db = getDb();
    const nProv = db.providers.find(p => p.slug === 'ninja');
    const key = nProv?.secretKey || nProv?.apiKey;
    if (key && typeof key === 'string' && key.trim()) return key.trim();
  } catch {}
  const key = process.env.NINJA_SECRET_KEY || process.env.NINJA_PUBLIC_KEY || '';
  return typeof key === 'string' ? key.trim() : '';
}

export const SERVICE_PROVIDER_MAP: Record<string, 'ninja' | 'veripine'> = {
  // Approved Ninja Services (Ninja ONLY):
  'NIN': 'ninja',
  'NIN_VERIFICATION': 'ninja',
  'NIN_LOOKUP': 'ninja',
  'NIN_STATUS': 'ninja',
  'NIN_STATUS_LOOKUP': 'ninja',
  'NIN_VERIFICATION_STATUS_LOOKUP': 'ninja',
  'BVN': 'ninja',
  'BVN_VERIFICATION': 'ninja',
  'DRIVERS_LICENSE': 'ninja',
  'DRIVING_LICENCE': 'ninja',
  'DRIVING_LICENCE_VERIFICATION': 'ninja',
  'BVN_CRM': 'ninja',
  'BVN_BY_CRM': 'ninja',

  // Approved Veripine Services (Veripine ONLY):
  'PHONE': 'veripine',
  'PHONE_NUMBER_VERIFICATION': 'veripine',
  'PHONE_VERIFICATION': 'veripine',
  'NIN_PHONE': 'veripine',
  'NIN_PHONE_SEARCH': 'veripine',
  'DEMOGRAPHIC_VERIFICATION': 'veripine',
  'DEMOGRAPHIC': 'veripine',
  'DEMOGRAPHIC_SEARCH': 'veripine',
  'PERSONALIZATION': 'veripine',
  'NIN_TRACKING': 'veripine',
  'IDENTITY_LOOKUP': 'veripine',
  'IDENTITY_CROSS_LOOKUP': 'veripine',

  // Other Existing Platform Services (Veripine):
  'BVN_RETRIEVAL': 'veripine',
  'BVN_PHONE': 'veripine',
  'NIN_VALIDATION': 'veripine',
  'NIN_NAME_MOD': 'veripine',
  'NAME_MODIFICATION': 'veripine',
  'NIN_PHONE_MOD': 'veripine',
  'PHONE_NUMBER_MODIFICATION': 'veripine',
  'NIN_ADDRESS_MOD': 'veripine',
  'ADDRESS_MODIFICATION': 'veripine',
  'NIN_DOB_MOD': 'veripine',
  'NIN_MODIFICATION': 'veripine',
  'BIRTH_ATTESTATION': 'veripine',
  'IPE_CLEARANCE': 'veripine',
  'IPE_MODIFICATION': 'veripine',
  'NIN_DELINKING': 'veripine',
  'BVN_ANDROID_USER': 'veripine',
  'CAC_TIN': 'veripine',
  'CAC_REGISTRATION': 'veripine',
  'TIN': 'veripine',
  'TIN_INDIVIDUAL': 'veripine',
  'TIN_COMPANY': 'veripine',
  'SELF_SERVICE_EMAIL': 'veripine'
};

export class EnterpriseProviderAdapter implements VerificationProviderAdapter {
  public getProviderForService(serviceCode?: string): VerificationProvider | null {
    const db = getDb();
    if (serviceCode) {
      const codeUpper = serviceCode.toUpperCase();
      // 1. Check if the database service record explicitly specifies a provider
      const service = db.services.find(s => s.code.toUpperCase() === codeUpper);
      if (service) {
        if (service.defaultProvider) {
          const target = String(service.defaultProvider).toLowerCase();
          const matched = db.providers.find(p => (p.slug === target || p.id === target) && p.status === 'CONNECTED');
          if (matched) return matched;
        }
        if ((service as any).providerId) {
          const matched = db.providers.find(p => p.id === (service as any).providerId && p.status === 'CONNECTED');
          if (matched) return matched;
        }
      }

      // 2. Check SERVICE_PROVIDER_MAP
      const targetSlug = SERVICE_PROVIDER_MAP[codeUpper];
      if (targetSlug) {
        const matched = db.providers.find((p) => p.slug === targetSlug && p.status === 'CONNECTED');
        if (matched) return matched;
        const matchedAnyStatus = db.providers.find((p) => p.slug === targetSlug);
        if (matchedAnyStatus) return matchedAnyStatus;
      }
    }
    // 3. Fallback: prioritize connected Ninja provider, then any connected, then first
    return db.providers.find((p) => p.slug === 'ninja' && p.status === 'CONNECTED') ||
           db.providers.find((p) => p.status === 'CONNECTED') ||
           db.providers[0] ||
           null;
  }

  private getActiveProvider(serviceCode?: string): VerificationProvider | null {
    return this.getProviderForService(serviceCode);
  }

  async testConnection(targetProviderIdOrSlug?: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const db = getDb();
    let provider: VerificationProvider | null = null;
    if (targetProviderIdOrSlug) {
      provider = db.providers.find((p) => p.id === targetProviderIdOrSlug || p.slug === targetProviderIdOrSlug) || null;
    }
    if (!provider) {
      provider = this.getActiveProvider();
    }
    if (!provider) {
      return { success: false, message: 'No verification provider configured in the system.' };
    }

    const start = Date.now();
    try {
      // Test Veripine using live GET /balance endpoint
      if (provider.slug === 'veripine') {
        const apiKey = getVeripineApiKey(provider);
        if (!apiKey) {
          return { success: false, message: 'Veripine API credentials (VERIPINE_API_KEY / VERIPINE_SECRET_KEY) are missing.' };
        }
        const baseUrl = getVeripineBaseUrl(provider);
        const res = await fetch(`${baseUrl}/balance`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });
        const latencyMs = Date.now() - start;

        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          const balanceNum = Number(json?.data?.balance ?? 0);
          const balance = json?.data?.formatted_balance || (json?.data?.balance !== undefined ? `₦${balanceNum.toLocaleString()}` : 'Connected');
          const username = json?.data?.username || 'Authenticated User';
          provider.lastTestedAt = new Date().toISOString();
          provider.status = 'CONNECTED';
          provider.balance = balanceNum;
          if (balanceNum < 70) {
            return {
              success: false,
              message: `Connected to Veripine live gateway (${username}), but wallet balance is critically low (${balance}). Provider requires wallet funding to perform verifications.`,
              latencyMs
            };
          }
          return {
            success: true,
            message: `Connected to Veripine live gateway successfully. Gateway Balance: ${balance} (${username}).`,
            latencyMs
          };
        } else {
          return {
            success: false,
            message: `Veripine API returned HTTP ${res.status}: ${res.statusText || 'Authentication failed'}. Please check your VERIPINE_API_KEY.`,
            latencyMs
          };
        }
      }

      // Test Ninja using live identify probe endpoint
      if (provider.slug === 'ninja') {
        const secretKey = getNinjaSecretKey(provider) || getNinjaApiKey(provider);
        if (!secretKey) {
          return { success: false, message: 'Ninja API credentials (NINJA_SECRET_KEY / NINJA_PUBLIC_KEY) are missing.' };
        }
        const baseUrl = getNinjaBaseUrl(provider);
        const res = await fetch(`${baseUrl}/api/identity/identify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            idType: 'nin',
            mode: 'lookup',
            idNumber: '00000000000',
            reference: `ping_${Date.now()}`
          }),
          signal: AbortSignal.timeout(10000)
        });
        const latencyMs = Date.now() - start;

        if (res.ok || res.status === 200 || res.status === 404) {
          provider.lastTestedAt = new Date().toISOString();
          provider.status = 'CONNECTED';
          return {
            success: true,
            message: `Connected to Ninja API live gateway successfully (${latencyMs}ms). Credentials verified & operational.`,
            latencyMs
          };
        } else {
          return {
            success: false,
            message: `Ninja API returned HTTP ${res.status}: ${res.statusText || 'Authentication failed'}. Please check your Ninja API keys.`,
            latencyMs
          };
        }
      }

      // Test Paystack using live /balance endpoint
      if (provider.slug === 'paystack') {
        const secretKey = (provider.secretKey && !provider.secretKey.includes('your-paystack') ? provider.secretKey : (process.env.PAYSTACK_SECRET_KEY || 'sk_live_5c1a88b4e85201d2300faaa89b4fabd9a749a92e')).trim();
        if (!secretKey) {
          return { success: false, message: 'Paystack LIVE Secret Key (PAYSTACK_SECRET_KEY) is not configured.' };
        }
        const res = await fetch('https://api.paystack.co/balance', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });
        const latencyMs = Date.now() - start;
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          const balance = Array.isArray(json?.data) && json.data[0]?.balance !== undefined ? Number(json.data[0].balance) / 100 : 0;
          provider.lastTestedAt = new Date().toISOString();
          provider.status = 'CONNECTED';
          provider.balance = balance;
          return {
            success: true,
            message: `Connected to Paystack LIVE successfully. Live Balance: ₦${balance.toLocaleString()} NGN.`,
            latencyMs
          };
        } else {
          return {
            success: false,
            message: `Paystack returned HTTP ${res.status}: ${res.statusText || 'Authentication failed'}. Please check your Paystack Live Secret Key.`,
            latencyMs
          };
        }
      }

      // Default ping check for generic providers
      const baseUrl = (provider.baseUrl || '').replace(/\/$/, '');
      if (!baseUrl.startsWith('http')) {
        return { success: false, message: `${provider.name} baseUrl is invalid.` };
      }
      const res = await fetch(`${baseUrl}/ping`, {
        method: 'GET',
        headers: {
          'x-api-key': provider.apiKey || '',
          'Authorization': `Bearer ${provider.secretKey || provider.apiKey || ''}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      const latencyMs = Date.now() - start;

      if (res.ok) {
        provider.lastTestedAt = new Date().toISOString();
        provider.status = 'CONNECTED';
        return { success: true, message: `Connected to ${provider.name} successfully.`, latencyMs };
      } else {
        return {
          success: false,
          message: `${provider.name} returned HTTP ${res.status}: ${res.statusText}`,
          latencyMs
        };
      }
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      return {
        success: false,
        message: `${provider.name} connection test failed: ${isTimeout ? 'Provider connection timed out.' : (err.message || 'Network unreachable')}`
      };
    }
  }

  /**
   * Safe server-side diagnostic logging (NEVER logs API keys, secret credentials, or auth headers).
   */
  public logDiagnostic(info: {
    provider: string;
    service: string;
    endpoint: string;
    httpStatus?: number;
    errorCode?: string | number;
    errorMessage?: string;
    isBalanceError?: boolean;
    rawType?: string;
  }) {
    // Only output diagnostic warnings on actual upstream issues (HTTP 4xx/5xx or balance exhaustion)
    // to avoid false-positive error triggers on successful HTTP 200 responses.
    if (info.isBalanceError || (info.httpStatus && info.httpStatus >= 400)) {
      console.warn(
        `[Verification Gateway Alert] Provider: ${info.provider} | Service: ${info.service} | Endpoint: ${info.endpoint} | HTTP: ${info.httpStatus ?? 'N/A'} | Status: ${info.errorCode ?? info.rawType ?? 'N/A'} | Msg: "${info.errorMessage ?? 'N/A'}"`
      );
    }
  }

  /**
   * Helper to detect if an external upstream API error is caused by the gateway provider's own balance exhaustion.
   * Only classifies as insufficient balance when explicitly stated by provider or HTTP 402 Payment Required.
   * Never misclassifies 400, 401, 403, 404, 500, 503, invalid data, or generic messages as balance errors.
   */
  public isUpstreamBalanceError(msg?: string, status?: number): boolean {
    if (status === 402) return true;
    if (!msg || typeof msg !== 'string') return false;
    const lower = msg.toLowerCase().trim();
    if (!lower) return false;

    // Strict explicit matches only:
    return (
      lower.includes('insufficient wallet balance') ||
      lower.includes('insufficient balance') ||
      lower.includes('insufficient wallet') ||
      lower.includes('insufficient funds') ||
      lower.includes('insufficient fund') ||
      lower.includes('wallet balance is insufficient') ||
      lower.includes('provider wallet balance') ||
      lower.includes('credit exhausted') ||
      lower.includes('credits exhausted') ||
      lower.includes('low wallet balance') ||
      lower.includes('balance depleted') ||
      lower.includes('please fund your wallet') ||
      lower.includes('fund your wallet to continue')
    );
  }

  /**
   * Universal External API Caller with strictly enforced 2-minute timeout & structured response states:
   * A. SUCCESS (actual result returned)
   * B. API ERROR / PROVIDER ERROR (with preserved sanitized feedback)
   * C. TIMEOUT (2 minutes elapsed without response)
   * D. NETWORK / CONNECTION ERROR (DNS, connection, SSL, socket drop)
   * E. UNEXPECTED SYSTEM ERROR (runtime processing error)
   *
   * Automatically clears timeout countdown immediately if response arrives early.
   * Redacts sensitive API keys and authorization tokens.
   */
  public async callApi(options: {
    serviceCode: string;
    providerName: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    customTimeoutMs?: number;
  }): Promise<{
    success: boolean;
    status: ApiRequestStatus;
    httpStatus?: number;
    json: any | null;
    message: string;
    providerResponse: any | null;
    durationMs: number;
  }> {
    const startTime = Date.now();
    const timeoutMs = options.customTimeoutMs || getServiceTimeoutMs(options.serviceCode);

    console.log(
      `[API_REQUEST_STARTED] Service: ${options.serviceCode} | Provider: ${options.providerName} | URL: ${options.url} | MaxTimeout: ${timeoutMs}ms | Timestamp: ${new Date().toISOString()}`
    );

    const controller = new AbortController();
    let isTimedOut = false;
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isTimedOut = true;
        controller.abort();
      }
    }, timeoutMs);

    console.log(
      `[API_PROVIDER_CALLED] Service: ${options.serviceCode} | Provider: ${options.providerName} | Calling upstream provider API...`
    );

    try {
      const response = await fetch(options.url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body
          ? typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body)
          : undefined,
        signal: controller.signal,
        keepalive: true
      });

      clearTimeout(timer);
      isSettled = true;
      const durationMs = Date.now() - startTime;

      console.log(
        `[API_RESPONSE_RECEIVED] Service: ${options.serviceCode} | Provider: ${options.providerName} | HTTP: ${response.status} | Duration: ${durationMs}ms`
      );

      const rawJson = await response.json().catch(() => null);
      const sanitized = sanitizeProviderResponse(rawJson);

      const isBalErr = this.isUpstreamBalanceError(rawJson?.message, response.status);

      if (isBalErr || response.status === 402) {
        console.warn(
          `[API_PROVIDER_ERROR] Service: ${options.serviceCode} | Provider: ${options.providerName} | Balance Insufficient | HTTP: ${response.status} | Duration: ${durationMs}ms`
        );
        return {
          success: false,
          status: 'api_error',
          httpStatus: response.status,
          json: rawJson,
          message: 'Verification gateway provider wallet balance is insufficient. Please contact system administrator to fund the verification gateway.',
          providerResponse: sanitized,
          durationMs
        };
      }

      if (!response.ok) {
        const rawErrMsg = rawJson?.message || rawJson?.error || rawJson?.notice?.message || `Request failed with HTTP status ${response.status}`;
        console.warn(
          `[API_PROVIDER_ERROR] Service: ${options.serviceCode} | Provider: ${options.providerName} | HTTP: ${response.status} | Error: ${rawErrMsg} | Duration: ${durationMs}ms`
        );

        let userMsg = rawErrMsg;
        if (response.status === 401 || response.status === 403) {
          userMsg = 'Verification gateway authorization error. Please check provider credentials.';
        } else if (response.status === 404) {
          userMsg = rawJson?.message || 'No matching identity record found in the national registry database.';
        } else if (response.status === 409) {
          userMsg = rawJson?.message || 'Conflicting or duplicate request on registry gateway.';
        } else if (response.status === 422 || response.status === 400) {
          userMsg = rawJson?.message || rawJson?.error || `Invalid verification details submitted (HTTP ${response.status}).`;
        } else if (response.status === 429) {
          userMsg = 'National registry query rate limit reached. Please wait a moment and try again.';
        } else if (response.status === 502 || response.status === 503 || response.status === 504) {
          userMsg = 'National identity registry is temporarily unavailable. Please try again shortly.';
        } else if (response.status >= 500) {
          userMsg = rawJson?.message || `Registry gateway server error (HTTP ${response.status}).`;
        }

        console.log(`[API_REQUEST_COMPLETED] Service: ${options.serviceCode} | Status: api_error | Duration: ${durationMs}ms`);
        return {
          success: false,
          status: 'api_error',
          httpStatus: response.status,
          json: rawJson,
          message: userMsg,
          providerResponse: sanitized,
          durationMs
        };
      }

      // Check if 200 OK has explicit failure or not-found status in payload
      if (rawJson && (rawJson.status === 'not_found' || rawJson.found === false || rawJson.status === false)) {
        const notFoundMsg = rawJson.message || rawJson.error || 'No matching identity record found in the national registry.';
        console.log(`[API_REQUEST_COMPLETED] Service: ${options.serviceCode} | Status: api_error (Not Found) | Duration: ${durationMs}ms`);
        return {
          success: false,
          status: 'api_error',
          httpStatus: response.status,
          json: rawJson,
          message: notFoundMsg,
          providerResponse: sanitized,
          durationMs
        };
      }

      console.log(`[API_REQUEST_COMPLETED] Service: ${options.serviceCode} | Status: success | Duration: ${durationMs}ms`);
      return {
        success: true,
        status: 'success',
        httpStatus: response.status,
        json: rawJson,
        message: 'Verification completed successfully.',
        providerResponse: sanitized,
        durationMs
      };
    } catch (err: any) {
      clearTimeout(timer);
      isSettled = true;
      const durationMs = Date.now() - startTime;

      if (isTimedOut || err?.name === 'TimeoutError' || err?.name === 'AbortError' || err?.message?.toLowerCase().includes('timed out')) {
        console.error(
          `[API_TIMEOUT] Service: ${options.serviceCode} | Provider: ${options.providerName} | Request timed out after ${durationMs}ms (Limit: ${timeoutMs}ms)`
        );
        console.log(`[API_REQUEST_COMPLETED] Service: ${options.serviceCode} | Status: timeout | Duration: ${durationMs}ms`);
        return {
          success: false,
          status: 'timeout',
          json: null,
          message: 'API request timed out. The national registry gateway did not respond within the 2-minute waiting window.',
          providerResponse: null,
          durationMs
        };
      }

      const isNetwork =
        err?.name === 'TypeError' ||
        err?.code === 'ECONNREFUSED' ||
        err?.code === 'ENOTFOUND' ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'EHOSTUNREACH' ||
        err?.message?.includes('fetch failed') ||
        err?.message?.includes('network') ||
        err?.message?.includes('socket') ||
        err?.message?.includes('getaddrinfo');

      if (isNetwork) {
        console.error(
          `[API_NETWORK_ERROR] Service: ${options.serviceCode} | Provider: ${options.providerName} | Error: ${err?.message || 'Network unreachable'} | Duration: ${durationMs}ms`
        );
        console.log(`[API_REQUEST_COMPLETED] Service: ${options.serviceCode} | Status: network_error | Duration: ${durationMs}ms`);
        return {
          success: false,
          status: 'network_error',
          json: null,
          message: `Network connection error: Unable to reach verification gateway (${err?.message || 'connectivity failed'}).`,
          providerResponse: null,
          durationMs
        };
      }

      console.error(
        `[API_UNEXPECTED_ERROR] Service: ${options.serviceCode} | Provider: ${options.providerName} | Error: ${err?.message || 'Unknown error'} | Duration: ${durationMs}ms`
      );
      console.log(`[API_REQUEST_COMPLETED] Service: ${options.serviceCode} | Status: system_error | Duration: ${durationMs}ms`);
      return {
        success: false,
        status: 'system_error',
        json: null,
        message: `An unexpected system error occurred while processing the verification request: ${err?.message || 'Unknown error'}.`,
        providerResponse: null,
        durationMs
      };
    }
  }

  // =========================================================================
  // 1. NIN VERIFICATION (NINJA ONLY)
  // =========================================================================
  async verifyNIN(nin: string, extras?: Record<string, any>): Promise<ProviderResult> {
    const designatedProvider = this.getActiveProvider('NIN');
    const cleanNin = (nin || '').toString().replace(/\D/g, '').trim();

    if (!cleanNin || cleanNin.length !== 11) {
      return {
        success: false,
        status: 'api_error',
        message: 'A valid 11-digit National Identity Number (NIN) is required.',
        providerName: designatedProvider?.name || 'Ninja Identity Gateway'
      };
    }

    const ninjaProv = this.getProviderForService('NIN') || designatedProvider;
    const ninjaKey = getNinjaSecretKey(ninjaProv) || getNinjaApiKey(ninjaProv);

    if (!ninjaKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'Ninja API gateway credentials are not configured on the server. Please configure NINJA_SECRET_KEY or NINJA_PUBLIC_KEY.',
        providerName: ninjaProv?.name || 'Ninja Identity Gateway'
      };
    }

    const baseUrl = getNinjaBaseUrl(ninjaProv);
    const endpoint = '/api/identity/identify';
    const ref = `nin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const apiRes = await this.callApi({
      serviceCode: 'NIN',
      providerName: ninjaProv?.name || 'Ninja Identity Gateway',
      url: `${baseUrl}${endpoint}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ninjaKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        idType: 'nin',
        mode: 'lookup',
        idNumber: cleanNin,
        reference: ref
      }
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        rawHttpStatus: apiRes.httpStatus,
        durationMs: apiRes.durationMs,
        providerName: ninjaProv?.name || 'Ninja Identity Gateway'
      };
    }

    const json = apiRes.json;
    const d = json.data || json;
    const returnedNin = String(d?.id_number || d?.nin || cleanNin).trim();
    const firstName = String(d?.first_name || d?.firstname || d?.firstName || d?.['first-name'] || '').trim();
    const middleName = String(d?.middle_name || d?.middlename || d?.middleName || d?.['middle-name'] || '').trim();
    const surname = String(d?.last_name || d?.surname || d?.lastname || d?.lastName || d?.['last-name'] || '').trim();
    const fullName = (firstName || surname)
      ? [d?.title, firstName, middleName, surname].filter(Boolean).join(' ')
      : String(d?.fullname || d?.full_name || d?.fullName || d?.name || '').trim();

    const dateOfBirth = String(d?.date_of_birth || d?.dob || d?.dateOfBirth || d?.birthdate || d?.birth_date || '').trim();

    if (!returnedNin && !fullName && !firstName && !surname && !dateOfBirth && !d?.mobile && !d?.phone) {
      return {
        success: false,
        status: 'api_error',
        message: 'National identity registry returned an incomplete or unverified record.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: ninjaProv?.name || 'Ninja Identity Gateway'
      };
    }

    let photoUrl: string | null = null;
    const rawImg = d?.photoUrl || d?.photo_url || d?.image || d?.photo;
    if (rawImg && typeof rawImg === 'string' && rawImg.trim()) {
      const trimmed = rawImg.trim();
      photoUrl = trimmed.startsWith('data:') || trimmed.startsWith('http') ? trimmed : `data:image/jpeg;base64,${trimmed}`;
    }

    const fullAddress = [d.address_line, d.address_town, d.address_lga, d.address_state]
      .filter(Boolean)
      .join(', ') || d.address || d.residence_address || '';

    const canonicalData: CanonicalNinVerificationResult = {
      verified: true,
      firstName,
      middleName,
      surname,
      fullName,
      dateOfBirth,
      photoUrl,
      nin: returnedNin,
      phone: d.mobile || d.phone || d.telephoneno || d.telecomNumber || null,
      address: fullAddress || null,
      gender: d.gender ? String(d.gender).toUpperCase() : null,
      trackingId: d.id || d.trackingId || d.tracking_id || null,
      stateOfOrigin: d.address_state || d.state_of_origin || d.state || null,
      lgaOfOrigin: d.address_lga || d.lga_of_origin || d.lga || null,
      telecomNumber: d.mobile || d.phone || d.telephoneno || d.telecomNumber || null,
      residenceAddress: fullAddress || null,
      status: 'VERIFIED',
      rawResponse: json
    };

    return {
      success: true,
      status: 'success',
      data: canonicalData,
      message: 'Verification completed successfully.',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      rawHttpStatus: apiRes.httpStatus,
      durationMs: apiRes.durationMs,
      providerName: ninjaProv?.name || 'Ninja Identity Gateway'
    };
  }

  // =========================================================================
  // 2. BVN VERIFICATION (NINJA ONLY)
  // =========================================================================
  async verifyBVN(bvn: string, extras?: Record<string, any>): Promise<ProviderResult> {
    const designatedProvider = this.getActiveProvider('BVN');
    const cleanBvn = (bvn || '').toString().replace(/\D/g, '').trim();

    if (!cleanBvn || cleanBvn.length !== 11) {
      return {
        success: false,
        status: 'api_error',
        message: 'A valid 11-digit Bank Verification Number (BVN) is required.',
        providerName: designatedProvider?.name || 'Ninja Identity Gateway'
      };
    }

    const ninjaProv = this.getProviderForService('BVN') || designatedProvider;
    const ninjaKey = getNinjaSecretKey(ninjaProv) || getNinjaApiKey(ninjaProv);

    if (!ninjaKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'Ninja API gateway credentials are not configured on the server. Please configure NINJA_SECRET_KEY or NINJA_PUBLIC_KEY.',
        providerName: ninjaProv?.name || 'Ninja Identity Gateway'
      };
    }

    const baseUrl = getNinjaBaseUrl(ninjaProv);
    const endpoint = '/api/identity/identify';
    const ref = `bvn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const apiRes = await this.callApi({
      serviceCode: 'BVN',
      providerName: ninjaProv?.name || 'Ninja Identity Gateway',
      url: `${baseUrl}${endpoint}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ninjaKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        idType: 'bvn',
        mode: 'lookup',
        idNumber: cleanBvn,
        reference: ref
      }
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        rawHttpStatus: apiRes.httpStatus,
        durationMs: apiRes.durationMs,
        providerName: ninjaProv?.name || 'Ninja Identity Gateway'
      };
    }

    const json = apiRes.json;
    const d = json.data || json;
    const returnedBvn = String(d?.id_number || d?.bvn || cleanBvn).trim();
    const pFirstName = (d?.first_name || d?.firstname || '').toString().trim();
    const pMiddleName = (d?.middle_name || d?.middlename || '').toString().trim();
    const pSurname = (d?.last_name || d?.surname || '').toString().trim();
    const fullName = (pFirstName || pSurname)
      ? [d?.title, pFirstName, pMiddleName, pSurname].filter(Boolean).join(' ')
      : (d?.fullname || d?.full_name || d?.name || '');

    if (!returnedBvn && !fullName && !pFirstName && !pSurname && !d?.date_of_birth && !d?.dob) {
      return {
        success: false,
        status: 'api_error',
        message: 'Banking directory returned an incomplete or unverified record.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: ninjaProv?.name || 'Ninja Identity Gateway'
      };
    }

    let photoUrl: string | undefined = undefined;
    const rawImg = d.image || d.photo;
    if (rawImg) {
      photoUrl = rawImg.startsWith('data:') || rawImg.startsWith('http') ? rawImg : `data:image/jpeg;base64,${rawImg}`;
    }

    const fullAddress = [d.address_line, d.address_town, d.address_lga, d.address_state]
      .filter(Boolean)
      .join(', ') || d.address || d.residence_address || '';

    return {
      success: true,
      status: 'success',
      data: {
        bvn: returnedBvn || undefined,
        fullName,
        firstName: pFirstName,
        middleName: pMiddleName,
        surname: pSurname,
        dateOfBirth: d.date_of_birth || d.dob || '',
        gender: d.gender ? String(d.gender).toUpperCase() : '',
        phoneNumber: d.mobile || d.phone || d.telephoneno || '',
        email: d.email || '',
        residenceAddress: fullAddress,
        stateOfOrigin: d.address_state || d.state_of_origin || d.state || '',
        lgaOfOrigin: d.address_lga || d.lga_of_origin || d.lga || '',
        photoUrl,
        trackingId: d.id || d.trackingId || d.tracking_id || '',
        status: 'VERIFIED'
      },
      message: 'Verification completed successfully.',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      rawHttpStatus: apiRes.httpStatus,
      durationMs: apiRes.durationMs,
      providerName: ninjaProv?.name || 'Ninja Identity Gateway'
    };
  }

  // =========================================================================
  // 3. PHONE NUMBER VERIFICATION
  // =========================================================================
  async verifyPhone(phone: string, extras?: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('PHONE') || this.getActiveProvider('NIN_PHONE');
    let rawPhone = (phone || (extras?.phoneNumber || extras?.number || '')).toString().trim();
    let cleanPhone = rawPhone.replace(/\D/g, '');

    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    if (cleanPhone.length !== 11) {
      return {
        success: false,
        status: 'api_error',
        message: 'Invalid phone format. Phone number must be exactly 11 digits (e.g. 08012345678).',
        providerName: provider?.name || 'Telecom Verification Gateway'
      };
    }

    const apiKey = getVeripineApiKey(provider);
    if (!apiKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'Phone verification provider credentials are not configured (VERIPINE_API_KEY).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const baseUrl = getVeripineBaseUrl(provider);
    const apiRes = await this.callApi({
      serviceCode: 'PHONE',
      providerName: provider?.name || 'Veripine API Gateway',
      url: `${baseUrl}/nin-phone`,
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        phone: cleanPhone,
        consent: true
      }
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        rawHttpStatus: apiRes.httpStatus,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const json = apiRes.json;
    let d = json.data || json;
    if (d && typeof d === 'object' && d.data && typeof d.data === 'object') {
      d = d.data;
    }

    if (!d || (typeof d === 'object' && Object.keys(d).length === 0)) {
      return {
        success: false,
        status: 'api_error',
        message: json.message || 'No linked identity record found for this phone number.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const rawPhoto = d.photo || d.photoUrl || d.image;
    const photoUrl = rawPhoto
      ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:') ? rawPhoto : `data:image/jpeg;base64,${rawPhoto}`)
      : undefined;

    const firstName = (d.firstname || d.firstName || d.first_name || '').toString().trim();
    const middleName = (d.middlename || d.middleName || d.middle_name || '').toString().trim();
    const surname = (d.surname || d.lastName || d.lastname || d.last_name || '').toString().trim();
    const fullName = [firstName, middleName, surname].filter(Boolean).join(' ') || (d.fullName || d.name || '').toString().trim();
    const returnedNin = String(d.nin || d.id_number || '').trim();
    const returnedPhone = String(d.phone || d.telephoneno || d.mobile || '').trim();

    if (!returnedNin && !fullName && !firstName && !surname) {
      return {
        success: false,
        status: 'api_error',
        message: 'National identity registry returned an incomplete record with no verified name or NIN.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const fullAddress = [d.residence_address || d.address, d.residence_town || d.town, d.residence_lga || d.birthlga || d.lga, d.residence_state || d.birthstate || d.state]
      .filter(Boolean)
      .join(', ') || d.residence_address || d.address || '';

    return {
      success: true,
      status: 'success',
      data: {
        phoneNumber: returnedPhone || undefined,
        nin: returnedNin || undefined,
        fullName,
        firstName,
        surname,
        middleName,
        gender: (d.gender || '').toUpperCase(),
        dateOfBirth: d.birthdate || d.dob || d.date_of_birth || '',
        trackingId: d.trackingId || d.tracking_id || '',
        residenceAddress: fullAddress,
        stateOfOrigin: d.birthstate || d.state_of_origin || d.state || '',
        lgaOfOrigin: d.birthlga || d.lga_of_origin || d.lga || '',
        photoUrl,
        status: 'VERIFIED'
      },
      message: 'Verification completed successfully.',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      rawHttpStatus: apiRes.httpStatus,
      durationMs: apiRes.durationMs,
      providerName: provider?.name || 'Veripine API Gateway'
    };
  }

  // =========================================================================
  // 4. NIN PHONE SEARCH
  // =========================================================================
  async verifyNinPhoneSearch(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('NIN_PHONE');
    const rawPhone = (searchData.phone || searchData.phoneNumber || searchData.number || '').toString().trim();
    let cleanPhone = rawPhone.replace(/\D/g, '');

    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    if (cleanPhone.length !== 11) {
      return {
        success: false,
        status: 'api_error',
        message: 'A valid 11-digit registered mobile phone number is required (e.g. 08012345678).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const apiKey = getVeripineApiKey(provider);
    if (!apiKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'NIN Phone Search provider credentials are not configured (VERIPINE_API_KEY).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const baseUrl = getVeripineBaseUrl(provider);
    const apiRes = await this.callApi({
      serviceCode: 'NIN_PHONE',
      providerName: provider?.name || 'Veripine API Gateway',
      url: `${baseUrl}/nin-phone`,
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        phone: cleanPhone,
        consent: true
      }
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        rawHttpStatus: apiRes.httpStatus,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const json = apiRes.json;
    let d = json.data || json;
    if (d && typeof d === 'object' && d.data && typeof d.data === 'object') {
      d = d.data;
    }

    if (!d || (typeof d === 'object' && Object.keys(d).length === 0)) {
      return {
        success: false,
        status: 'api_error',
        message: json.message || 'No linked NIN record found for this phone number.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const rawPhoto = d.photo || d.photoUrl || d.image;
    const photoUrl = rawPhoto
      ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:') ? rawPhoto : `data:image/jpeg;base64,${rawPhoto}`)
      : undefined;

    const firstName = (d.firstname || d.firstName || d.first_name || '').toString().trim();
    const middleName = (d.middlename || d.middleName || d.middle_name || '').toString().trim();
    const surname = (d.surname || d.lastName || d.lastname || d.last_name || '').toString().trim();
    const fullName = [firstName, middleName, surname].filter(Boolean).join(' ') || (d.fullName || d.name || '').toString().trim();
    const returnedNin = String(d.nin || d.id_number || '').trim();
    const returnedPhone = String(d.phone || d.telephoneno || d.mobile || '').trim();

    if (!returnedNin && !fullName && !firstName && !surname) {
      return {
        success: false,
        status: 'api_error',
        message: 'National identity registry returned an incomplete record with no verified name or NIN.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const fullAddress = [d.residence_address || d.address, d.residence_town || d.town, d.residence_lga || d.birthlga || d.lga, d.residence_state || d.birthstate || d.state]
      .filter(Boolean)
      .join(', ') || d.residence_address || d.address || '';

    return {
      success: true,
      status: 'success',
      data: {
        nin: returnedNin || undefined,
        fullName,
        firstName,
        surname,
        middleName,
        phoneNumber: returnedPhone || undefined,
        gender: (d.gender || '').toUpperCase(),
        dateOfBirth: d.birthdate || d.dob || d.date_of_birth || '',
        trackingId: d.trackingId || d.tracking_id || '',
        residenceAddress: fullAddress,
        stateOfOrigin: d.birthstate || d.state_of_origin || d.state || '',
        lgaOfOrigin: d.birthlga || d.lga_of_origin || d.lga || '',
        photoUrl,
        status: 'VERIFIED'
      },
      message: 'Verification completed successfully.',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      rawHttpStatus: apiRes.httpStatus,
      durationMs: apiRes.durationMs,
      providerName: provider?.name || 'Veripine API Gateway'
    };
  }

  // =========================================================================
  // 5. BVN RETRIEVAL BY PHONE
  // =========================================================================
  async verifyBvnRetrieval(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('BVN_RETRIEVAL');
    const rawPhone = (searchData.phone || searchData.phoneNumber || searchData.number || '').toString().trim();
    let cleanPhone = rawPhone.replace(/\D/g, '');

    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    if (cleanPhone.length !== 11) {
      return {
        success: false,
        status: 'api_error',
        message: 'A valid 11-digit registered mobile phone number is required for BVN Retrieval (e.g. 08012345678).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const apiKey = getVeripineApiKey(provider);
    if (!apiKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'BVN Retrieval provider credentials are not configured (VERIPINE_API_KEY).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const baseUrl = getVeripineBaseUrl(provider);
    const apiRes = await this.callApi({
      serviceCode: 'BVN_RETRIEVAL',
      providerName: provider?.name || 'Veripine API Gateway',
      url: `${baseUrl}/bvn-phone`,
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        phone: cleanPhone,
        consent: true
      }
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        rawHttpStatus: apiRes.httpStatus,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const json = apiRes.json;
    let d = json.data || json;
    if (d && typeof d === 'object' && d.data && typeof d.data === 'object') {
      d = d.data;
    }

    if (!d || (typeof d === 'object' && Object.keys(d).length === 0)) {
      return {
        success: false,
        status: 'api_error',
        message: json.message || 'No matching BVN record found for this phone number.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const firstName = (d.firstname || d.firstName || d.first_name || '').toString().trim();
    const middleName = (d.middlename || d.middleName || d.middle_name || '').toString().trim();
    const surname = (d.surname || d.lastName || d.lastname || d.last_name || '').toString().trim();
    const fullName = [firstName, middleName, surname].filter(Boolean).join(' ') || (d.fullName || d.name || '').toString().trim();
    const returnedBvn = String(d.bvn || d.id_number || '').trim();
    const returnedPhone = String(d.phone || d.phoneNumber || d.telephoneno || d.mobile || '').trim();

    if (!returnedBvn && !fullName && !firstName && !surname) {
      return {
        success: false,
        status: 'api_error',
        message: 'Banking directory returned an incomplete record with no verified name or BVN.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const rawPhoto = d.photo || d.photoUrl || d.image;
    const photoUrl = rawPhoto
      ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:') ? rawPhoto : `data:image/jpeg;base64,${rawPhoto}`)
      : undefined;

    const fullAddress = [d.residence_address || d.address || d.residentialAddress, d.residence_town || d.town, d.residence_lga || d.lga, d.residence_state || d.state]
      .filter(Boolean)
      .join(', ') || d.residence_address || d.address || d.residentialAddress || '';

    return {
      success: true,
      status: 'success',
      data: {
        bvn: returnedBvn || undefined,
        fullName,
        firstName,
        surname,
        middleName,
        phoneNumber: returnedPhone || undefined,
        dateOfBirth: d.birthdate || d.dob || d.dateOfBirth || '',
        gender: (d.gender || '').toUpperCase(),
        residenceAddress: fullAddress,
        photoUrl,
        retrievalReference: (d.retrievalReference || d.reference || '').toString().trim() || undefined,
        status: 'VERIFIED'
      },
      message: 'Verification completed successfully.',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      rawHttpStatus: apiRes.httpStatus,
      durationMs: apiRes.durationMs,
      providerName: provider?.name || 'Veripine API Gateway'
    };
  }

  // =========================================================================
  // 6. DEMOGRAPHIC VERIFICATION
  // =========================================================================
  async verifyDemographicVerification(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('DEMOGRAPHIC_VERIFICATION') || this.getActiveProvider('NIN_PHONE');
    const firstName = (searchData.firstName || searchData.firstname || '').toString().trim();
    const lastName = (searchData.lastName || searchData.lastname || searchData.surname || '').toString().trim();
    const rawGender = (searchData.gender || '').toString().trim().toLowerCase();
    const gender = (rawGender === 'female' || rawGender === 'f') ? 'female' : 'male';
    let dob = (searchData.dob || searchData.dateOfBirth || '').toString().trim();

    if (!firstName || !lastName || !dob) {
      return {
        success: false,
        status: 'api_error',
        message: 'First name, last name, and date of birth are all required for demographic verification.',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    // Build normalized DOB representations
    const cleanDob = dob.replace(/[.\/]/g, '-');
    const [p1, p2, p3] = cleanDob.split('-');
    let dobYmd = cleanDob;
    let dobDmy = cleanDob;
    if (p1 && p2 && p3) {
      if (p1.length === 4) {
        dobYmd = `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
        dobDmy = `${p3.padStart(2, '0')}-${p2.padStart(2, '0')}-${p1}`;
      } else if (p3.length === 4) {
        dobYmd = `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
        dobDmy = `${p1.padStart(2, '0')}-${p2.padStart(2, '0')}-${p3}`;
      }
    }

    const apiKey = getVeripineApiKey(provider);
    if (!apiKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'Demographic verification provider credentials are not configured (VERIPINE_API_KEY).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const baseUrl = getVeripineBaseUrl(provider);

    // Prepare comprehensive payload matching both camelCase and snake_case specifications
    const primaryPayload: Record<string, any> = {
      firstname: firstName,
      firstName: firstName,
      lastname: lastName,
      lastName: lastName,
      surname: lastName,
      gender: gender,
      gender_code: gender === 'female' ? 'F' : 'M',
      dob: dobYmd,
      dateOfBirth: dobYmd,
      birthdate: dobYmd,
      consent: true
    };

    let apiRes = await this.callApi({
      serviceCode: 'DEMOGRAPHIC_VERIFICATION',
      providerName: provider?.name || 'Veripine API Gateway',
      url: `${baseUrl}/nin-demography`,
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: primaryPayload
    });

    // If 400 Invalid request data, attempt fallback with DD-MM-YYYY DOB and strict fields
    if (!apiRes.success && apiRes.httpStatus === 400) {
      const fallbackPayload = {
        firstname: firstName,
        surname: lastName,
        dob: dobDmy,
        gender: gender === 'female' ? 'Female' : 'Male',
        consent: true
      };

      const retryRes = await this.callApi({
        serviceCode: 'DEMOGRAPHIC_VERIFICATION',
        providerName: provider?.name || 'Veripine API Gateway',
        url: `${baseUrl}/nin-demography`,
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: fallbackPayload
      });

      if (retryRes.success || retryRes.httpStatus !== 400) {
        apiRes = retryRes;
      }
    }

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        rawHttpStatus: apiRes.httpStatus,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const json = apiRes.json;
    let d = json.data || json;
    if (d && typeof d === 'object' && d.data && typeof d.data === 'object') {
      d = d.data;
    }

    if (!d || (typeof d === 'object' && Object.keys(d).length === 0)) {
      return {
        success: false,
        status: 'api_error',
        message: json.message || 'No matching demographic record found in national registry.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const rawPhoto = d.photo || d.photoUrl || d.image;
    const photoUrl = rawPhoto
      ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:') ? rawPhoto : `data:image/jpeg;base64,${rawPhoto}`)
      : undefined;

    const rawSig = d.signature;
    const signature = rawSig
      ? (rawSig.startsWith('data:') || rawSig.startsWith('http') ? rawSig : `data:image/png;base64,${rawSig}`)
      : undefined;

    const verifiedFirstName = (d.firstname || d.firstName || d.first_name || '').toString().trim();
    const verifiedMiddleName = (d.middlename || d.middleName || d.middle_name || '').toString().trim();
    const verifiedSurname = (d.surname || d.lastName || d.lastname || d.last_name || '').toString().trim();
    const verifiedFullName = (
      (verifiedFirstName || verifiedSurname)
        ? [verifiedFirstName, verifiedMiddleName, verifiedSurname].filter(Boolean).join(' ')
        : (d.fullName || d.fullname || d.name || '')
    ).toString().trim();
    const verifiedNin = (d.nin || d.id_number || '').toString().trim();
    const verifiedDob = (d.birthdate || d.dob || d.date_of_birth || d.dateOfBirth || '').toString().trim();
    const verifiedGender = (d.gender ? String(d.gender).toUpperCase() : '').trim();

    if (!verifiedNin && !verifiedFullName && !d.photo && !d.image) {
      return {
        success: false,
        status: 'api_error',
        message: 'National identity registry returned insufficient or empty demographic match data.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const fullAddress = [d.residence_address || d.address, d.residence_town || d.town, d.residence_lga || d.birthlga || d.lga, d.residence_state || d.birthstate || d.state]
      .filter(Boolean)
      .join(', ') || d.residence_address || d.address || '';

    return {
      success: true,
      status: 'success',
      data: {
        nin: verifiedNin || undefined,
        fullName: verifiedFullName,
        firstName: verifiedFirstName,
        surname: verifiedSurname,
        middleName: verifiedMiddleName,
        gender: verifiedGender,
        dateOfBirth: verifiedDob,
        phoneNumber: (d.phone || d.telephoneno || d.mobile || '').toString().trim(),
        trackingId: (d.trackingId || d.tracking_id || '').toString().trim(),
        residenceAddress: fullAddress,
        stateOfOrigin: (d.birthstate || d.state_of_origin || d.state || '').toString().trim(),
        lgaOfOrigin: (d.birthlga || d.lga_of_origin || d.lga || '').toString().trim(),
        photoUrl,
        signature,
        status: 'VERIFIED'
      },
      message: 'Verification completed successfully.',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      rawHttpStatus: apiRes.httpStatus,
      durationMs: apiRes.durationMs,
      providerName: provider?.name || 'Veripine API Gateway'
    };
  }

  // =========================================================================
  // 7. PERSONALIZATION (NIN TRACKING ID)
  // =========================================================================
  async verifyPersonalization(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('PERSONALIZATION');
    const apiKey = getVeripineApiKey(provider);

    const trackingId = (searchData.trackingId || searchData.tracking_id || searchData.trackingNo || searchData.searchQuery || '').toString().trim();
    if (!trackingId) {
      return {
        success: false,
        status: 'api_error',
        message: 'NIMC tracking ID is required for personalization slip retrieval.',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    if (!apiKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'Personalization slip provider credentials are not configured (VERIPINE_API_KEY).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const baseUrl = getVeripineBaseUrl(provider);
    const apiRes = await this.callApi({
      serviceCode: 'PERSONALIZATION',
      providerName: provider?.name || 'Veripine API Gateway',
      url: `${baseUrl}/nin-tracking`,
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        tracking_id: trackingId,
        consent: true
      }
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        rawHttpStatus: apiRes.httpStatus,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const json = apiRes.json;
    let d = json.data || json;
    if (d && typeof d === 'object' && d.data && typeof d.data === 'object') {
      d = d.data;
    }

    if (!d || (typeof d === 'object' && Object.keys(d).length === 0)) {
      return {
        success: false,
        status: 'api_error',
        message: json.message || 'No tracking record found for this tracking ID.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const rawPhoto = d.photo || d.photoUrl || d.image;
    const photoUrl = rawPhoto
      ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:') ? rawPhoto : `data:image/jpeg;base64,${rawPhoto}`)
      : undefined;

    const firstName = (d.firstname || d.firstName || d.first_name || '').toString().trim();
    const middleName = (d.middlename || d.middleName || d.middle_name || '').toString().trim();
    const surname = (d.surname || d.lastName || d.lastname || d.last_name || '').toString().trim();
    const fullName = [firstName, middleName, surname].filter(Boolean).join(' ') || (d.fullName || d.name || '').toString().trim();
    const returnedNin = String(d.nin || d.id_number || '').trim();
    const returnedTracking = String(d.trackingId || d.tracking_id || '').trim();

    if (!returnedNin && !fullName && !returnedTracking) {
      return {
        success: false,
        status: 'api_error',
        message: 'Tracking record returned incomplete or unverified data from registry.',
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    return {
      success: true,
      status: 'success',
      data: {
        nin: returnedNin || undefined,
        fullName,
        firstName,
        surname,
        middleName,
        trackingId: returnedTracking || undefined,
        dateOfBirth: (d.dob || d.birthdate || '').toString().trim(),
        gender: (d.gender || '').toString().toUpperCase(),
        phoneNumber: (d.phone || d.telephoneno || '').toString().trim(),
        residenceAddress: (d.residence_address || d.address || '').toString().trim(),
        photoUrl,
        status: 'RETRIEVED'
      },
      message: 'Verification completed successfully.',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      rawHttpStatus: apiRes.httpStatus,
      durationMs: apiRes.durationMs,
      providerName: provider?.name || 'Veripine API Gateway'
    };
  }

  // =========================================================================
  // 8. NIN VALIDATION
  // =========================================================================
  async verifyNinValidation(nin: string, trackingId?: string, extras?: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('NIN_VALIDATION');
    const veripineKey = getVeripineApiKey(provider);
    if (!veripineKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'Veripine verification gateway is not configured with an API key (VERIPINE_API_KEY).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const baseUrl = getVeripineBaseUrl(provider);
    const apiRes = await this.callApi({
      serviceCode: 'NIN_VALIDATION',
      providerName: provider?.name || 'Veripine API Gateway',
      url: `${baseUrl}/nin-modification`,
      method: 'POST',
      headers: {
        'x-api-key': veripineKey,
        'Authorization': `Bearer ${veripineKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        service_type: 'nin_validation',
        nin,
        dob: extras?.dob || trackingId,
        consent: true
      }
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        data: null,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        rawHttpStatus: apiRes.httpStatus,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const json = apiRes.json;
    let d = json.data || json;
    if (d && typeof d === 'object' && d.data && typeof d.data === 'object') {
      d = d.data;
    }

    return {
      success: true,
      status: 'success',
      data: {
        nin: String(d.nin || d.id_number || '').trim(),
        validationStatus: 'VALID_AND_ACTIVE',
        referenceId: json.reference_id || d.reference_id,
        details: d,
        status: 'VERIFIED'
      },
      message: 'Verification completed successfully.',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      rawHttpStatus: apiRes.httpStatus,
      durationMs: apiRes.durationMs,
      providerName: provider?.name || 'Veripine API Gateway'
    };
  }

  // =========================================================================
  // 9. IDENTITY CROSS LOOKUP (Veripine ONLY - No fallback)
  // =========================================================================
  async lookupIdentity(query: string, extras?: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('IDENTITY_CROSS_LOOKUP') || this.getActiveProvider('IDENTITY_LOOKUP');
    const apiKey = getVeripineApiKey(provider);

    if (!apiKey) {
      return {
        success: false,
        unconfigured: true,
        message: 'Veripine verification gateway is not configured with an API key (VERIPINE_API_KEY).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const cleaned = (query || extras?.searchQuery || extras?.phone || extras?.trackingId || extras?.nin || '').toString().trim();
    if (!cleaned && (!extras || Object.keys(extras).length === 0)) {
      return {
        success: false,
        message: 'Search identifier (NIN, Phone Number, or Tracking ID) is required for Identity Cross Lookup.',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    const baseUrl = getVeripineBaseUrl(provider);

    try {
      const cleanDigits = cleaned.replace(/\D/g, '');
      const isTrackingId = (/^[A-Za-z0-9]{12,24}$/i.test(cleaned) && !/^\d+$/.test(cleaned)) || !!extras?.tracking_id || !!extras?.trackingId;
      const isPhone = (cleanDigits.length === 11 && cleanDigits.startsWith('0')) || !!extras?.phone;

      // 1. If Tracking ID provided
      if (isTrackingId || extras?.tracking_id || extras?.trackingId) {
        const trackingId = (extras?.tracking_id || extras?.trackingId || cleaned).toString().trim();
        const apiRes = await this.callApi({
          serviceCode: 'IDENTITY_CROSS_LOOKUP',
          providerName: provider?.name || 'Veripine API Gateway',
          url: `${baseUrl}/nin-tracking`,
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: {
            tracking_id: trackingId,
            consent: true
          }
        });

        if (!apiRes.success || !apiRes.json) {
          return {
            success: false,
            status: apiRes.status,
            message: apiRes.message,
            providerResponse: apiRes.providerResponse,
            rawResponse: apiRes.json,
            durationMs: apiRes.durationMs,
            providerName: provider?.name || 'Veripine API Gateway'
          };
        }

        const json = apiRes.json;
        let d = json.data || json;
        if (d && typeof d === 'object' && d.data && typeof d.data === 'object') d = d.data;
        if (d && (d.nin || d.firstname || d.fullName || d.surname || d.tracking_id || d.trackingId)) {
          const res = this.formatVeripineCrossResult(d, json, provider?.name || 'Veripine API Gateway');
          res.status = 'success';
          res.providerResponse = apiRes.providerResponse;
          res.durationMs = apiRes.durationMs;
          return res;
        }
      }

      // 2. If phone number or 11 digits starting with 0
      if (isPhone || cleanDigits.length === 11) {
        const phoneToQuery = extras?.phone ? String(extras.phone).replace(/\D/g, '') : cleanDigits;
        const apiRes = await this.callApi({
          serviceCode: 'IDENTITY_CROSS_LOOKUP',
          providerName: provider?.name || 'Veripine API Gateway',
          url: `${baseUrl}/nin-phone`,
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: {
            phone: phoneToQuery,
            consent: true
          }
        });

        if (!apiRes.success || !apiRes.json) {
          return {
            success: false,
            status: apiRes.status,
            message: apiRes.message,
            providerResponse: apiRes.providerResponse,
            rawResponse: apiRes.json,
            durationMs: apiRes.durationMs,
            providerName: provider?.name || 'Veripine API Gateway'
          };
        }

        const json = apiRes.json;
        let d = json.data || json;
        if (d && typeof d === 'object' && d.data && typeof d.data === 'object') d = d.data;
        if (d && (d.nin || d.firstname || d.fullName || d.surname || d.phone)) {
          const res = this.formatVeripineCrossResult(d, json, provider?.name || 'Veripine API Gateway');
          res.status = 'success';
          res.providerResponse = apiRes.providerResponse;
          res.durationMs = apiRes.durationMs;
          return res;
        }

        return {
          success: false,
          status: 'api_error',
          message: json?.message || `No linked identity record found for phone/NIN (${phoneToQuery}) on Veripine gateway.`,
          providerName: provider?.name || 'Veripine API Gateway',
          providerResponse: apiRes.providerResponse,
          rawResponse: json,
          durationMs: apiRes.durationMs
        };
      }

      // 3. If demographic parameters provided
      if (extras?.firstname && extras?.surname) {
        const apiRes = await this.callApi({
          serviceCode: 'IDENTITY_CROSS_LOOKUP',
          providerName: provider?.name || 'Veripine API Gateway',
          url: `${baseUrl}/nin-demography`,
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: {
            firstname: extras.firstname,
            surname: extras.surname,
            dob: extras.dob || extras.dateOfBirth,
            gender: extras.gender,
            state: extras.state,
            lga: extras.lga,
            consent: true
          }
        });

        if (!apiRes.success || !apiRes.json) {
          return {
            success: false,
            status: apiRes.status,
            message: apiRes.message,
            providerResponse: apiRes.providerResponse,
            rawResponse: apiRes.json,
            durationMs: apiRes.durationMs,
            providerName: provider?.name || 'Veripine API Gateway'
          };
        }

        const json = apiRes.json;
        let d = json.data || json;
        if (d && typeof d === 'object' && d.data && typeof d.data === 'object') d = d.data;
        if (d && (d.nin || d.firstname || d.fullName || d.surname)) {
          const res = this.formatVeripineCrossResult(d, json, provider?.name || 'Veripine API Gateway');
          res.status = 'success';
          res.providerResponse = apiRes.providerResponse;
          res.durationMs = apiRes.durationMs;
          return res;
        }
      }

      // 4. Try nin-tracking as general fallback for alphanumeric codes
      const apiRes = await this.callApi({
        serviceCode: 'IDENTITY_CROSS_LOOKUP',
        providerName: provider?.name || 'Veripine API Gateway',
        url: `${baseUrl}/nin-tracking`,
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: {
          tracking_id: cleaned,
          consent: true
        }
      });

      if (!apiRes.success || !apiRes.json) {
        return {
          success: false,
          status: apiRes.status,
          message: apiRes.message,
          providerResponse: apiRes.providerResponse,
          rawResponse: apiRes.json,
          durationMs: apiRes.durationMs,
          providerName: provider?.name || 'Veripine API Gateway'
        };
      }

      const trackingJson = apiRes.json;
      let d = trackingJson.data || trackingJson;
      if (d && typeof d === 'object' && d.data && typeof d.data === 'object') d = d.data;
      if (d && (d.nin || d.firstname || d.fullName || d.surname || d.tracking_id || d.trackingId)) {
        const res = this.formatVeripineCrossResult(d, trackingJson, provider?.name || 'Veripine API Gateway');
        res.status = 'success';
        res.providerResponse = apiRes.providerResponse;
        res.durationMs = apiRes.durationMs;
        return res;
      }

      return {
        success: false,
        status: 'api_error',
        message: trackingJson?.message || `No matching identity record found for query (${cleaned}) on Veripine gateway. Please verify your input.`,
        providerName: provider?.name || 'Veripine API Gateway',
        providerResponse: apiRes.providerResponse,
        rawResponse: trackingJson,
        durationMs: apiRes.durationMs
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'system_error',
        message: 'Veripine Identity Cross Lookup service encountered an unexpected error. Please try again.',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }
  }

  private formatVeripineCrossResult(d: any, rawJson: any, providerName: string): ProviderResult {
    const rawPhoto = d.photo || d.photoUrl || d.image;
    const photoUrl = rawPhoto
      ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:') ? rawPhoto : `data:image/jpeg;base64,${rawPhoto}`)
      : undefined;

    const firstName = (d.firstname || d.firstName || d.first_name || '').toString().trim();
    const middleName = (d.middlename || d.middleName || d.middle_name || '').toString().trim();
    const surname = (d.surname || d.lastName || d.lastname || d.last_name || '').toString().trim();
    const fullName = [firstName, middleName, surname].filter(Boolean).join(' ') || (d.fullName || d.name || '').toString().trim();
    const returnedNin = String(d.nin || d.id_number || d.vnin || '').trim();
    const returnedPhone = String(d.phone || d.telephoneno || d.mobile || '').trim();
    const returnedTracking = String(d.trackingId || d.tracking_id || '').trim();

    const fullAddress = [
      d.residence_address || d.address,
      d.residence_town || d.town,
      d.residence_lga || d.birthlga || d.lga,
      d.residence_state || d.birthstate || d.state
    ].filter(Boolean).join(', ') || d.residence_address || d.address || '';

    return {
      success: true,
      providerName,
      rawResponse: rawJson,
      data: {
        nin: returnedNin || undefined,
        phoneNumber: returnedPhone || undefined,
        fullName,
        firstName,
        surname,
        middleName,
        gender: (d.gender || '').toUpperCase(),
        dateOfBirth: (d.birthdate || d.dob || d.date_of_birth || '').toString().trim(),
        trackingId: returnedTracking || undefined,
        residenceAddress: fullAddress,
        stateOfOrigin: (d.birthstate || d.state_of_origin || d.self_origin_state || d.state || '').toString().trim(),
        lgaOfOrigin: (d.birthlga || d.lga_of_origin || d.self_origin_lga || d.lga || '').toString().trim(),
        religion: (d.religion || '').toString().trim(),
        maritalStatus: (d.maritalstatus || '').toString().trim(),
        employmentStatus: (d.employmentstatus || '').toString().trim(),
        photoUrl,
        status: 'VERIFIED'
      }
    };
  }

  // =========================================================================
  // 10. DRIVERS LICENSE
  // =========================================================================
  async verifyDriversLicense(licenseNumber: string, dob?: string): Promise<ProviderResult> {
    const provider = this.getActiveProvider('DRIVERS_LICENSE');
    const secretKey = getNinjaSecretKey(provider) || getNinjaApiKey(provider);

    if (!secretKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'FRSC driver license gateway credentials are not configured.',
        providerName: provider?.name || 'Ninja API'
      };
    }

    const baseUrl = getNinjaBaseUrl(provider);
    const apiRes = await this.callApi({
      serviceCode: 'DRIVERS_LICENSE',
      providerName: provider?.name || 'Ninja API',
      url: `${baseUrl}/api/identity/identify`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        idType: 'drivers_license',
        mode: 'lookup',
        idNumber: licenseNumber,
        dob,
        reference: `frsc_${Date.now()}`
      }
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Ninja API'
      };
    }

    const json = apiRes.json;
    if (json && json.data) {
      return {
        success: true,
        status: 'success',
        providerName: provider?.name || 'Ninja API',
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        data: json.data
      };
    }

    return {
      success: false,
      status: 'api_error',
      message: json?.message || 'Driver license could not be verified with FRSC.',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      providerName: provider?.name || 'Ninja API'
    };
  }

  // =========================================================================
  // 11. NIN MODIFICATION
  // =========================================================================
  async verifyNinModification(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('NIN_MODIFICATION');
    const apiKey = getVeripineApiKey(provider);
    if (!apiKey) {
      return {
        success: false,
        unconfigured: true,
        message: 'Veripine API verification gateway is not configured with an API key (VERIPINE_API_KEY).',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }

    let serviceType = 'nin_name_modification';
    const modType = (searchData.modificationType || searchData.serviceType || searchData.service_type || '').toLowerCase();
    if (modType.includes('phone')) {
      serviceType = 'nin_phone_modification';
    } else if (modType.includes('address')) {
      serviceType = 'nin_address_modification';
    } else if (modType.includes('validation')) {
      serviceType = 'nin_validation';
    }

    try {
      const baseUrl = getVeripineBaseUrl(provider);
      const payload: Record<string, any> = {
        service_type: serviceType,
        nin: searchData.nin,
        consent: true
      };

      if (serviceType === 'nin_name_modification') {
        payload.surname = searchData.currentSurname || searchData.surname;
        payload.firstname = searchData.currentFirstName || searchData.firstName;
        payload.new_surname = searchData.newSurname || searchData.new_surname || searchData.surname;
        payload.new_firstname = searchData.newFirstName || searchData.new_firstname || searchData.firstName;
        if (searchData.phone) payload.phone = searchData.phone;
      } else if (serviceType === 'nin_phone_modification') {
        payload.phone = searchData.currentPhone || searchData.phone;
        payload.new_phone = searchData.newPhone || searchData.new_phone;
      } else if (serviceType === 'nin_address_modification') {
        payload.address = searchData.currentAddress || searchData.address;
        payload.new_address = searchData.newAddress || searchData.new_address;
      } else if (serviceType === 'nin_validation') {
        if (searchData.dob) payload.dob = searchData.dob;
      }

      const apiRes = await this.callApi({
        serviceCode: 'NIN_MODIFICATION',
        providerName: provider?.name || 'Veripine API Gateway',
        url: `${baseUrl}/nin-modification`,
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payload
      });

      if (!apiRes.success || !apiRes.json) {
        return {
          success: false,
          status: apiRes.status,
          message: apiRes.message,
          providerResponse: apiRes.providerResponse,
          rawResponse: apiRes.json,
          durationMs: apiRes.durationMs,
          providerName: provider?.name || 'Veripine API Gateway'
        };
      }

      const json = apiRes.json;
      if (json.status !== 'success') {
        return {
          success: false,
          status: 'api_error',
          message: json?.message || 'NIN Modification submission was rejected by the registry.',
          providerResponse: apiRes.providerResponse,
          rawResponse: json,
          durationMs: apiRes.durationMs,
          providerName: provider?.name || 'Veripine API Gateway'
        };
      }

      const d = json.data || json;
      return {
        success: true,
        status: 'success',
        providerName: provider?.name || 'Veripine API Gateway',
        providerResponse: apiRes.providerResponse,
        rawResponse: json,
        durationMs: apiRes.durationMs,
        data: {
          status: 'SUBMITTED',
          serviceType,
          orderId: d.order_id || json.order_id,
          referenceId: d.reference_id || json.reference_id,
          message: json.message || 'NIN modification order placed successfully.',
          details: d
        }
      };
    } catch {
      return {
        success: false,
        status: 'system_error',
        message: 'NIN Modification service encountered an unexpected error.',
        providerName: provider?.name || 'Veripine API Gateway'
      };
    }
  }

  // =========================================================================
  // 12. BIRTH ATTESTATION
  // =========================================================================
  async verifyBirthAttestation(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider();
    if (!provider || (!provider.apiKey && !provider.secretKey)) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'Birth Attestation API provider is not yet configured.',
        providerName: provider?.name || 'NPC Provider'
      };
    }

    const apiRes = await this.callApi({
      serviceCode: 'BIRTH_ATTESTATION',
      providerName: provider.name,
      url: `${provider.baseUrl}/api/v1/npc/birth-attestation/process`,
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey || '',
        'app-id': provider.secretKey || '',
        'Content-Type': 'application/json'
      },
      body: searchData
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider.name
      };
    }

    const json = apiRes.json;
    return {
      success: true,
      status: 'success',
      providerName: provider.name,
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      data: json.data || json
    };
  }

  // =========================================================================
  // 13. BVN CRM
  // =========================================================================
  async verifyBvnCrm(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('BVN_CRM');
    const secretKey = getNinjaSecretKey(provider) || getNinjaApiKey(provider);
    if (!secretKey) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'Ninja API (BVN by CRM) verification gateway is not configured.',
        providerName: provider?.name || 'Ninja API'
      };
    }

    const baseUrl = getNinjaBaseUrl(provider);
    const apiRes = await this.callApi({
      serviceCode: 'BVN_CRM',
      providerName: provider?.name || 'Ninja API',
      url: `${baseUrl}/api/v1/banking/bvn/crm-lookup`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: searchData
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider?.name || 'Ninja API'
      };
    }

    const json = apiRes.json;
    return {
      success: true,
      status: 'success',
      providerName: provider?.name || 'Ninja API',
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      data: json.data || json
    };
  }

  // =========================================================================
  // 14. BVN MODIFICATION
  // =========================================================================
  async verifyBvnModification(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider();
    if (!provider || (!provider.apiKey && !provider.secretKey)) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'BVN Modification API provider is not yet configured.',
        providerName: provider?.name || 'NIBSS Clearing House'
      };
    }

    const apiRes = await this.callApi({
      serviceCode: 'BVN_MODIFICATION',
      providerName: provider.name,
      url: `${provider.baseUrl}/api/v1/banking/bvn/modification/submit`,
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey || '',
        'app-id': provider.secretKey || '',
        'Content-Type': 'application/json'
      },
      body: searchData
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider.name
      };
    }

    const json = apiRes.json;
    return {
      success: true,
      status: 'success',
      providerName: provider.name,
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      data: json.data || json
    };
  }

  // =========================================================================
  // 15. IPE CLEARANCE & MODIFICATION
  // =========================================================================
  async verifyIpeClearance(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider('IPE_CLEARANCE');
    if (!provider || (!provider.apiKey && !provider.secretKey)) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'Identity Clearance verification gateway is not configured.',
        providerName: provider?.name || 'Identity Clearance Gateway'
      };
    }

    const apiRes = await this.callApi({
      serviceCode: 'IPE_CLEARANCE',
      providerName: provider.name,
      url: `${provider.baseUrl}/api/v1/identity/ipe/clearance`,
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey || '',
        'app-id': provider.secretKey || '',
        'Content-Type': 'application/json'
      },
      body: searchData
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider.name
      };
    }

    const json = apiRes.json;
    return {
      success: true,
      status: 'success',
      providerName: provider.name,
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      data: json.data || json
    };
  }

  async verifyIpeModification(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider();
    if (!provider || (!provider.apiKey && !provider.secretKey)) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'IPE Modification API provider is not yet configured.',
        providerName: provider?.name || 'Unconfigured Provider'
      };
    }

    const apiRes = await this.callApi({
      serviceCode: 'IPE_MODIFICATION',
      providerName: provider.name,
      url: `${provider.baseUrl}/api/v1/identity/ipe/modification`,
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey || '',
        'app-id': provider.secretKey || '',
        'Content-Type': 'application/json'
      },
      body: searchData
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider.name
      };
    }

    const json = apiRes.json;
    return {
      success: true,
      status: 'success',
      providerName: provider.name,
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      data: json.data || json
    };
  }

  // =========================================================================
  // 16. NIN DELINKING & BVN ANDROID USER
  // =========================================================================
  async verifyNinDelinking(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider();
    if (!provider || (!provider.apiKey && !provider.secretKey)) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'NIN Delinking API provider is not yet configured.',
        providerName: provider?.name || 'NCC/NIMC Gateway'
      };
    }

    const apiRes = await this.callApi({
      serviceCode: 'NIN_DELINKING',
      providerName: provider.name,
      url: `${provider.baseUrl}/api/v1/nimc/delinking/execute`,
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey || '',
        'app-id': provider.secretKey || '',
        'Content-Type': 'application/json'
      },
      body: searchData
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider.name
      };
    }

    const json = apiRes.json;
    return {
      success: true,
      status: 'success',
      providerName: provider.name,
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      data: json.data || json
    };
  }

  async verifyBvnAndroidUser(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider();
    if (!provider || (!provider.apiKey && !provider.secretKey)) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'BVN Android User agent approval API is not yet configured.',
        providerName: provider?.name || 'NIBSS Agent Gateway'
      };
    }

    const apiRes = await this.callApi({
      serviceCode: 'BVN_ANDROID_USER',
      providerName: provider.name,
      url: `${provider.baseUrl}/api/v1/banking/bvn/android-agent/register`,
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey || '',
        'app-id': provider.secretKey || '',
        'Content-Type': 'application/json'
      },
      body: searchData
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider.name
      };
    }

    const json = apiRes.json;
    return {
      success: true,
      status: 'success',
      providerName: provider.name,
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      data: json.data || json
    };
  }

  // =========================================================================
  // 17. CAC & TIN VERIFICATION
  // =========================================================================
  async verifyCacTin(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider();
    if (!provider || (!provider.apiKey && !provider.secretKey)) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'CAC & TIN integration provider is not yet configured.',
        providerName: provider?.name || 'CAC Gateway'
      };
    }

    const apiRes = await this.callApi({
      serviceCode: 'CAC_TIN',
      providerName: provider.name,
      url: `${provider.baseUrl}/api/v1/corporate/cac-tin/process`,
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey || '',
        'app-id': provider.secretKey || '',
        'Content-Type': 'application/json'
      },
      body: searchData
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider.name
      };
    }

    const json = apiRes.json;
    return {
      success: true,
      status: 'success',
      providerName: provider.name,
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      data: json.data || json
    };
  }

  async verifyTin(searchData: Record<string, any>): Promise<ProviderResult> {
    const provider = this.getActiveProvider();
    if (!provider || (!provider.apiKey && !provider.secretKey)) {
      return {
        success: false,
        status: 'api_error',
        unconfigured: true,
        message: 'TIN verification and issuance API is not yet configured.',
        providerName: provider?.name || 'FIRS / JTB Gateway'
      };
    }

    const apiRes = await this.callApi({
      serviceCode: 'TIN',
      providerName: provider.name,
      url: `${provider.baseUrl}/api/v1/tax/tin/lookup`,
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey || '',
        'app-id': provider.secretKey || '',
        'Content-Type': 'application/json'
      },
      body: searchData
    });

    if (!apiRes.success || !apiRes.json) {
      return {
        success: false,
        status: apiRes.status,
        message: apiRes.message,
        providerResponse: apiRes.providerResponse,
        rawResponse: apiRes.json,
        durationMs: apiRes.durationMs,
        providerName: provider.name
      };
    }

    const json = apiRes.json;
    return {
      success: true,
      status: 'success',
      providerName: provider.name,
      providerResponse: apiRes.providerResponse,
      rawResponse: json,
      durationMs: apiRes.durationMs,
      data: json.data || json
    };
  }

  // =========================================================================
  // DISPATCHER: Enforce Strict Routing Policies
  // - default: Multi-gateway auto routing (can use any gateway)
  // - ninja: Strict Ninja Identity Gateway ONLY (no other gateway)
  // - veripine: Strict Veripine Gateway ONLY (no other gateway)
  // - admin: Strict Admin Gateway (routed for manual administrator processing)
  // =========================================================================
  async executeService(serviceCode: string, searchData: Record<string, any>): Promise<ProviderResult> {
    const code = (serviceCode || '').toUpperCase();
    const db = getDb();
    const serviceRecord = db.services?.find(s => s.code.toUpperCase() === code || s.id === serviceCode);
    const configuredProvider = (serviceRecord?.defaultProvider || 'default').toLowerCase().trim();

    // 1. ADMIN GATEWAY: Route to admins for manual review
    if (configuredProvider === 'admin' || configuredProvider === 'admin_gateway' || configuredProvider === 'manual') {
      return {
        success: false,
        unconfigured: false,
        apiCallState: 'api_not_called',
        apiCalled: false,
        apiResponseReceived: false,
        message: 'This service is configured on Admin Gateway and will be processed manually by Administrators.',
        providerName: 'Admin Gateway'
      };
    }

    // 2. NINJA ONLY GATEWAY
    if (configuredProvider === 'ninja') {
      const ninjaProv = this.getProviderForService(code) || db.providers.find(p => p.slug === 'ninja');
      const ninjaKey = getNinjaSecretKey(ninjaProv) || getNinjaApiKey(ninjaProv);

      if (!ninjaKey) {
        return {
          success: false,
          unconfigured: true,
          apiCallState: 'api_not_called',
          apiCalled: false,
          apiResponseReceived: false,
          message: 'Ninja API gateway credentials are not configured on the server.',
          providerName: 'Ninja Identity Gateway'
        };
      }

      let res: ProviderResult;
      if (code === 'NIN' || code.startsWith('NIN_') || code === 'NIN_VERIFICATION' || code === 'NIN_LOOKUP') {
        res = await this.verifyNIN(searchData.nin || Object.values(searchData)[0], searchData);
      } else if (code === 'BVN' || code.startsWith('BVN_') || code === 'BVN_VERIFICATION') {
        if (code === 'BVN_CRM' || code === 'BVN_BY_CRM') {
          res = await this.verifyBvnCrm(searchData);
        } else {
          res = await this.verifyBVN(searchData.bvn || Object.values(searchData)[0], searchData);
        }
      } else if (code === 'DRIVERS_LICENSE' || code === 'DRIVING_LICENCE' || code === 'DRIVING_LICENCE_VERIFICATION') {
        res = await this.verifyDriversLicense(searchData.licenseNumber || searchData.license_number, searchData.dob || searchData.dateOfBirth);
      } else {
        // Ninja generic identity lookup
        const queryVal = searchData.nin || searchData.bvn || searchData.searchQuery || searchData.phone || Object.values(searchData)[0];
        res = await this.verifyNIN(queryVal, searchData);
      }

      // Ensure no fallback outside of Ninja
      if (!res.apiCallState) {
        res.apiCallState = res.unconfigured ? 'api_not_called' : 'api_called_response_received';
        res.apiCalled = !res.unconfigured;
        res.apiResponseReceived = !res.unconfigured;
      }
      return res;
    }

    // 3. VERIPINE ONLY GATEWAY
    if (configuredProvider === 'veripine') {
      const veripineProv = this.getProviderForService(code) || db.providers.find(p => p.slug === 'veripine');
      const veripineKey = getVeripineApiKey(veripineProv);

      if (!veripineKey) {
        return {
          success: false,
          unconfigured: true,
          apiCallState: 'api_not_called',
          apiCalled: false,
          apiResponseReceived: false,
          message: 'Veripine API gateway credentials are not configured (VERIPINE_API_KEY).',
          providerName: 'Veripine API Gateway'
        };
      }

      let res: ProviderResult;
      if (code === 'PHONE' || code === 'PHONE_NUMBER_VERIFICATION' || code === 'PHONE_VERIFICATION') {
        res = await this.verifyPhone(searchData.phone || searchData.phoneNumber || searchData.number, searchData);
      } else if (code === 'NIN_PHONE' || code === 'NIN_PHONE_SEARCH') {
        res = await this.verifyNinPhoneSearch(searchData);
      } else if (code === 'BVN_RETRIEVAL' || code === 'BVN_PHONE') {
        res = await this.verifyBvnRetrieval(searchData);
      } else if (code === 'PERSONALIZATION' || code === 'NIN_TRACKING') {
        res = await this.verifyPersonalization(searchData);
      } else if (code === 'NIN_VALIDATION') {
        res = await this.verifyNinValidation(searchData.nin, searchData.trackingId || searchData.dob, searchData);
      } else if (code === 'DEMOGRAPHIC_VERIFICATION' || code === 'DEMOGRAPHIC' || code === 'DEMOGRAPHIC_SEARCH') {
        res = await this.verifyDemographicVerification(searchData);
      } else if (code.includes('MODIFICATION')) {
        res = await this.verifyNinModification(searchData);
      } else {
        res = await this.lookupIdentity(searchData.searchQuery || searchData.phone || searchData.nin || Object.values(searchData)[0] || '', searchData);
      }

      // Ensure no fallback outside of Veripine
      if (!res.apiCallState) {
        res.apiCallState = res.unconfigured ? 'api_not_called' : 'api_called_response_received';
        res.apiCalled = !res.unconfigured;
        res.apiResponseReceived = !res.unconfigured;
      }
      return res;
    }

    // 4. DEFAULT ROUTING (Auto: Can use any gateway suited for the service)
    const targetProvider = SERVICE_PROVIDER_MAP[code] || 'ninja';

    if (targetProvider === 'ninja') {
      const ninjaProv = this.getProviderForService(code) || db.providers.find(p => p.slug === 'ninja');
      const ninjaKey = getNinjaSecretKey(ninjaProv) || getNinjaApiKey(ninjaProv);

      if (!ninjaKey) {
        return {
          success: false,
          unconfigured: true,
          apiCallState: 'api_not_called',
          apiCalled: false,
          apiResponseReceived: false,
          message: 'Ninja API gateway credentials are not configured on the server.',
          providerName: 'Ninja Identity Gateway'
        };
      }
    } else if (targetProvider === 'veripine') {
      const veripineProv = this.getProviderForService(code) || db.providers.find(p => p.slug === 'veripine');
      const veripineKey = getVeripineApiKey(veripineProv);
      if (!veripineKey) {
        return {
          success: false,
          unconfigured: true,
          apiCallState: 'api_not_called',
          apiCalled: false,
          apiResponseReceived: false,
          message: 'Veripine API gateway credentials are not configured (VERIPINE_API_KEY).',
          providerName: 'Veripine API Gateway'
        };
      }
    }

    let res: ProviderResult;
    switch (code) {
      // Ninja Handled Services
      case 'NIN':
      case 'NIN_VERIFICATION':
      case 'NIN_LOOKUP':
      case 'NIN_STATUS':
      case 'NIN_STATUS_LOOKUP':
      case 'NIN_VERIFICATION_STATUS_LOOKUP':
        res = await this.verifyNIN(searchData.nin, searchData);
        break;
      case 'BVN':
      case 'BVN_VERIFICATION':
        res = await this.verifyBVN(searchData.bvn, searchData);
        break;
      case 'IDENTITY_LOOKUP':
      case 'IDENTITY_CROSS_LOOKUP':
        res = await this.lookupIdentity(searchData.searchQuery || searchData.phone || searchData.nin || searchData.trackingId || searchData.tracking_id || Object.values(searchData)[0], searchData);
        break;
      case 'DRIVERS_LICENSE':
      case 'DRIVING_LICENCE':
      case 'DRIVING_LICENCE_VERIFICATION':
        res = await this.verifyDriversLicense(searchData.licenseNumber || searchData.license_number, searchData.dob || searchData.dateOfBirth);
        break;
      case 'BVN_CRM':
      case 'BVN_BY_CRM':
        res = await this.verifyBvnCrm(searchData);
        break;

      // Veripine Handled Services
      case 'NIN_PHONE':
      case 'NIN_PHONE_SEARCH':
        res = await this.verifyNinPhoneSearch(searchData);
        break;
      case 'BVN_RETRIEVAL':
      case 'BVN_PHONE':
        res = await this.verifyBvnRetrieval(searchData);
        break;
      case 'PERSONALIZATION':
      case 'NIN_TRACKING':
        res = await this.verifyPersonalization(searchData);
        break;
      case 'NIN_VALIDATION':
        res = await this.verifyNinValidation(searchData.nin, searchData.trackingId || searchData.dob, searchData);
        break;
      case 'NIN_MODIFICATION':
      case 'NIN_NAME_MOD':
      case 'NAME_MODIFICATION':
      case 'NIN_PHONE_MOD':
      case 'PHONE_NUMBER_MODIFICATION':
      case 'NIN_ADDRESS_MOD':
      case 'ADDRESS_MODIFICATION':
        res = await this.verifyNinModification(searchData);
        break;

      // Telecom & Clearance Handled Services
      case 'PHONE':
      case 'PHONE_NUMBER_VERIFICATION':
      case 'PHONE_VERIFICATION':
        res = await this.verifyPhone(searchData.phone || searchData.phoneNumber || searchData.number, searchData);
        break;
      case 'IPE_CLEARANCE':
        res = await this.verifyIpeClearance(searchData);
        break;

      // Other platform services
      case 'DEMOGRAPHIC_VERIFICATION':
      case 'DEMOGRAPHIC':
      case 'DEMOGRAPHIC_SEARCH':
        res = await this.verifyDemographicVerification(searchData);
        break;
      case 'BIRTH_ATTESTATION':
        res = await this.verifyBirthAttestation(searchData);
        break;
      case 'BVN_MODIFICATION':
        res = await this.verifyBvnModification(searchData);
        break;
      case 'IPE_MODIFICATION':
        res = await this.verifyIpeModification(searchData);
        break;
      case 'NIN_DELINKING':
        res = await this.verifyNinDelinking(searchData);
        break;
      case 'BVN_ANDROID_USER':
        res = await this.verifyBvnAndroidUser(searchData);
        break;
      case 'CAC_TIN':
        res = await this.verifyCacTin(searchData);
        break;
      case 'TIN':
        res = await this.verifyTin(searchData);
        break;
      default:
        res = await this.lookupIdentity(Object.values(searchData)[0] || '', searchData);
        break;
    }

    // Set authoritative server-side API call state if not already explicitly tagged
    if (!res.apiCallState) {
      if (res.unconfigured) {
        res.apiCallState = 'api_not_called';
        res.apiCalled = false;
        res.apiResponseReceived = false;
      } else if (
        res.message &&
        (res.message.toLowerCase().includes('timed out') ||
         res.message.toLowerCase().includes('unreachable') ||
         res.message.toLowerCase().includes('gateway is temporarily unavailable')) &&
        !res.rawResponse
      ) {
        res.apiCallState = 'api_call_failed_before_response';
        res.apiCalled = true;
        res.apiResponseReceived = false;
      } else {
        // Legitimate upstream API call made and response received from provider
        res.apiCallState = 'api_called_response_received';
        res.apiCalled = true;
        res.apiResponseReceived = true;
      }
    }

    return res;
  }
}

export const providerAdapter = new EnterpriseProviderAdapter();
