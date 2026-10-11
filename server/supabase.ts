import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  User,
  Wallet,
  WalletTransaction,
  FundingRequest,
  CustomerServiceRequest,
  AuditLog,
  Service,
  AgentAdminOnboarding
} from './types';

const defaultUrl = 'https://yhwtkowbvbhfmskyxtju.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlod3Rrb3didmJoZm1za3l4dGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxOTgwNjcsImV4cCI6MjEwNTc3NDA2N30.81ncPny9dbX5o_IO76daPt0TymIMCuVLbl60hHP7hNo';

export function cleanSupabaseUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      return `${u.protocol}//${u.host}`;
    } catch {
      return trimmed.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    }
  }
  return null;
}

export function isValidSupabaseKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 20) return false;
  // A URL or path is NEVER a valid Supabase API key
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return false;
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes(' ')) return false;
  if (trimmed.includes('your-anon-public-key') || trimmed.includes('your-service-role-key')) return false;
  return true;
}

export function extractServiceRoleKey(): string | null {
  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_URL
  ];
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    const trimmed = c.trim();
    if (trimmed.split('.').length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(trimmed.split('.')[1], 'base64').toString('utf8'));
        if (payload.role === 'service_role') {
          return trimmed;
        }
      } catch {}
    }
  }
  return null;
}

export function extractSupabaseProjectUrl(): string {
  const directUrl = cleanSupabaseUrl(process.env.SUPABASE_URL) || cleanSupabaseUrl(process.env.VITE_SUPABASE_URL);
  if (directUrl) return directUrl;

  const candidates = [
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY
  ];
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    const trimmed = c.trim();
    if (trimmed.split('.').length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(trimmed.split('.')[1], 'base64').toString('utf8'));
        if (payload.ref) {
          return `https://${payload.ref}.supabase.co`;
        }
      } catch {}
    }
  }
  return defaultUrl;
}

// Clean and resolve Supabase project URL
export const supabaseUrl = extractSupabaseProjectUrl();

export function isSupabaseServiceRoleActive(): boolean {
  const key = extractServiceRoleKey();
  return Boolean(key && isValidSupabaseKey(key));
}

const rawAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)?.trim();
const effectiveServiceKey = extractServiceRoleKey();

const effectiveAnonKey = (rawAnonKey && isValidSupabaseKey(rawAnonKey))
  ? rawAnonKey
  : defaultAnonKey;

// Privileged operations require service-role key. Public reads can use anon key.
export const supabaseKey = effectiveServiceKey || effectiveAnonKey;

export let supabaseServer: SupabaseClient | null = null;
export let supabaseAnonServer: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseServer = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (err) {
    console.warn('Failed to initialize server Supabase client:', err);
  }
}

if (supabaseUrl && effectiveAnonKey) {
  try {
    supabaseAnonServer = createClient(supabaseUrl, effectiveAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (err) {
    console.warn('Failed to initialize server Supabase anon client:', err);
  }
}

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  url: string;
  servicesCount: number;
  settingsFound: boolean;
  usersCount?: number;
  isServiceRole: boolean;
  error?: string;
}> {
  const tryTestWithClient = async (client: SupabaseClient | null, isServiceRole: boolean) => {
    if (!client) return null;
    try {
      const [servicesRes, settingsRes] = await Promise.all([
        client.from('services').select('id, code, name', { count: 'exact' }),
        client.from('platform_settings').select('*').limit(1)
      ]);

      if (servicesRes.error) {
        return {
          connected: false,
          url: supabaseUrl,
          servicesCount: 0,
          settingsFound: false,
          isServiceRole,
          error: servicesRes.error.message
        };
      }

      let usersCount = 0;
      try {
        const usersRes = await client.from('users').select('id', { count: 'exact', head: true });
        if (!usersRes.error && typeof usersRes.count === 'number') {
          usersCount = usersRes.count;
        }
      } catch {}

      return {
        connected: true,
        url: supabaseUrl,
        servicesCount: servicesRes.count || (servicesRes.data ? servicesRes.data.length : 0),
        settingsFound: Boolean(settingsRes.data && settingsRes.data.length > 0),
        usersCount,
        isServiceRole
      };
    } catch (err: any) {
      return {
        connected: false,
        url: supabaseUrl,
        servicesCount: 0,
        settingsFound: false,
        isServiceRole,
        error: err.message || String(err)
      };
    }
  };

  let primaryResult = await tryTestWithClient(supabaseServer, isSupabaseServiceRoleActive());
  if (primaryResult && primaryResult.connected) {
    return primaryResult;
  }

  // Fallback to anon server if primary had an authentication/key error
  if (supabaseAnonServer && supabaseAnonServer !== supabaseServer) {
    const anonResult = await tryTestWithClient(supabaseAnonServer, false);
    if (anonResult && anonResult.connected) {
      return anonResult;
    }
  }

  return primaryResult || {
    connected: false,
    url: supabaseUrl,
    servicesCount: 0,
    settingsFound: false,
    isServiceRole: false,
    error: 'Supabase client not initialized.'
  };
}

// =========================================================================
// SCHEMA MAPPERS (CAMELCASE <-> SNAKE_CASE SUPABASE POSTGRESQL TABLES)
// =========================================================================

export function mapUserToSupabaseRow(u: User): Record<string, any> {
  return {
    id: u.id,
    email: (u.email || '').toLowerCase().trim(),
    username: u.username || u.email.split('@')[0],
    full_name: u.fullName || 'UGOPAWAVERIFY User',
    phone: u.phone || '+2348000000000',
    phone2: u.phone2 || null,
    password_hash: u.passwordHash || null,
    salt: u.salt || null,
    transaction_pin_hash: u.transactionPinHash || null,
    pin_salt: u.pinSalt || null,
    role: u.role || 'USER',
    status: u.status || 'ACTIVE',
    avatar_url: u.avatarUrl || null,
    onboarding_status: u.onboardingStatus || (u.role === 'MEGA_ADMIN' ? 'approved' : 'not_started'),
    onboarding_approved_at: u.onboardingApprovedAt || null,
    onboarding_approved_by: u.onboardingApprovedBy || null,
    role_at_approval: u.roleAtApproval || null,
    assigned_services: u.assignedServices || [],
    satisfaction_title: u.satisfactionTitle || 'Accredited Operator',
    dob: u.dob || null,
    nin: u.nin || null,
    profile_photo: u.avatarUrl || null,
    certificates: u.certificates || [],
    created_at: u.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function mapSupabaseRowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    phone: row.phone,
    phone2: row.phone2 || undefined,
    passwordHash: row.password_hash || '',
    salt: row.salt || '',
    transactionPinHash: row.transaction_pin_hash || '',
    pinSalt: row.pin_salt || '',
    role: row.role || 'USER',
    status: row.status || 'ACTIVE',
    avatarUrl: row.avatar_url || row.profile_photo || '',
    onboardingStatus: row.onboarding_status || (row.role === 'MEGA_ADMIN' ? 'approved' : 'not_started'),
    onboardingApprovedAt: row.onboarding_approved_at || undefined,
    onboardingApprovedBy: row.onboarding_approved_by || undefined,
    roleAtApproval: row.role_at_approval || undefined,
    assignedServices: Array.isArray(row.assigned_services) ? row.assigned_services : [],
    satisfactionTitle: row.satisfaction_title || undefined,
    dob: row.dob || undefined,
    nin: row.nin || undefined,
    certificates: Array.isArray(row.certificates) ? row.certificates : [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

export function mapWalletToSupabaseRow(w: Wallet): Record<string, any> {
  return {
    id: w.id,
    user_id: w.userId,
    available_balance: Number(w.availableBalance || 0),
    pending_balance: Number(w.pendingBalance || 0),
    total_deposited: Number(w.totalDeposited || 0),
    total_spent: Number(w.totalSpent || 0),
    created_at: w.updatedAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function mapSupabaseRowToWallet(row: any): Wallet {
  return {
    id: row.id,
    userId: row.user_id,
    availableBalance: Number(row.available_balance || 0),
    pendingBalance: Number(row.pending_balance || 0),
    totalDeposited: Number(row.total_deposited || 0),
    totalSpent: Number(row.total_spent || 0),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

export function mapTransactionToSupabaseRow(t: WalletTransaction): Record<string, any> {
  return {
    id: t.id,
    wallet_id: t.walletId,
    user_id: t.userId,
    reference: t.reference,
    type: t.type,
    amount: Number(t.amount || 0),
    fee: Number(t.fee || 0),
    balance_before: Number(t.balanceBefore || 0),
    balance_after: Number(t.balanceAfter || 0),
    status: t.status || 'SUCCESS',
    description: t.description || 'Transaction',
    metadata: t.metadata || {},
    created_at: t.createdAt || new Date().toISOString()
  };
}

export function mapSupabaseRowToTransaction(row: any): WalletTransaction {
  return {
    id: row.id,
    walletId: row.wallet_id,
    userId: row.user_id,
    reference: row.reference,
    type: row.type,
    amount: Number(row.amount || 0),
    fee: Number(row.fee || 0),
    balanceBefore: Number(row.balance_before || 0),
    balanceAfter: Number(row.balance_after || 0),
    status: row.status,
    description: row.description,
    metadata: row.metadata || {},
    createdAt: row.created_at
  };
}

export function mapFundingRequestToSupabaseRow(r: FundingRequest): Record<string, any> {
  let methodEnum = 'CARD';
  if (r.method === 'BANK_TRANSFER' || r.method === 'MANUAL') {
    methodEnum = r.method;
  }
  return {
    id: r.id,
    user_id: r.userId,
    user_name: r.userName,
    user_email: r.userEmail,
    reference: r.reference,
    amount: Number(r.amount || 0),
    method: methodEnum,
    status: r.status || 'PENDING',
    receipt_url: r.receiptUrl || null,
    receipt_name: r.receiptName || null,
    admin_note: r.adminNote || null,
    reviewed_by: r.reviewedBy || null,
    reviewed_at: r.reviewedAt || null,
    created_at: r.createdAt || new Date().toISOString()
  };
}

export function mapSupabaseRowToFundingRequest(row: any): FundingRequest {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    reference: row.reference,
    amount: Number(row.amount || 0),
    method: row.method,
    status: row.status,
    receiptUrl: row.receipt_url || undefined,
    receiptName: row.receipt_name || undefined,
    adminNote: row.admin_note || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined,
    createdAt: row.created_at
  };
}

export async function createSupabaseAuthUser(user: {
  email: string;
  password?: string;
  fullName?: string;
  phone?: string;
}): Promise<string | null> {
  if (!supabaseServer) return null;
  try {
    if (supabaseServer.auth && (supabaseServer.auth as any).admin) {
      const { data, error } = await (supabaseServer.auth as any).admin.createUser({
        email: user.email,
        password: user.password || 'Temporary@2026!',
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          phone: user.phone,
          role: 'USER'
        }
      });
      if (!error && data?.user?.id) {
        return data.user.id;
      }
    }
  } catch {}
  return null;
}

export function mapServiceRequestToSupabaseRow(s: CustomerServiceRequest): Record<string, any> {
  return {
    id: s.id,
    ticket_id: s.ticketId,
    user_id: s.userId,
    service_code: s.serviceCode,
    service_name: s.serviceName,
    status: s.status || 'PENDING',
    form_data: s.submittedData || {},
    result_data: {
      adminResultText: s.adminResultText,
      adminResultFiles: s.adminResultFiles,
      timeline: s.timeline
    },
    created_at: s.createdAt || new Date().toISOString(),
    updated_at: s.updatedAt || new Date().toISOString()
  };
}

export function mapSupabaseRowToServiceRequest(row: any): CustomerServiceRequest {
  const resultData = row.result_data || {};
  return {
    id: row.id,
    ticketId: row.ticket_id,
    userId: row.user_id,
    customerName: row.customer_name || 'Customer',
    customerEmail: row.customer_email || '',
    serviceId: row.service_id || '',
    serviceCode: row.service_code,
    serviceName: row.service_name,
    serviceCategory: row.service_category || 'General',
    price: Number(row.price || 0),
    status: row.status,
    submittedData: row.form_data || {},
    adminResultText: resultData.adminResultText,
    adminResultFiles: resultData.adminResultFiles,
    timeline: Array.isArray(resultData.timeline) ? resultData.timeline : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// =========================================================================
// AUTHORITATIVE SUPABASE DATABASE OPERATIONS
// =========================================================================

/**
 * Fetch all users directly from Supabase public.users
 */
export async function fetchSupabaseUsers(): Promise<User[] | null> {
  if (!supabaseServer) return null;
  try {
    const { data, error } = await supabaseServer
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(mapSupabaseRowToUser);
    }
  } catch (err: any) {
    console.warn('[Supabase DB] fetchSupabaseUsers notice:', err.message || err);
  }
  return null;
}

/**
 * Fetch a single user by ID directly from Supabase
 */
export async function fetchSupabaseUserById(userId: string): Promise<User | null> {
  const tryFetch = async (client: SupabaseClient | null) => {
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return mapSupabaseRowToUser(data);
      }
    } catch (err: any) {
      console.warn('[Supabase DB] fetchSupabaseUserById notice:', err.message || err);
    }
    return null;
  };

  let user = await tryFetch(supabaseServer);
  if (!user && supabaseAnonServer && supabaseAnonServer !== supabaseServer) {
    user = await tryFetch(supabaseAnonServer);
  }
  return user;
}

/**
 * Fetch a user by email or username directly from Supabase
 */
export async function fetchSupabaseUserByIdentifier(identifier: string): Promise<User | null> {
  const clean = identifier.trim().toLowerCase();
  const tryFetch = async (client: SupabaseClient | null) => {
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('users')
        .select('*')
        .or(`email.eq.${clean},username.eq.${clean}`)
        .maybeSingle();

      if (!error && data) {
        return mapSupabaseRowToUser(data);
      }
    } catch (err: any) {
      console.warn('[Supabase DB] fetchSupabaseUserByIdentifier notice:', err.message || err);
    }
    return null;
  };

  let user = await tryFetch(supabaseServer);
  if (!user && supabaseAnonServer && supabaseAnonServer !== supabaseServer) {
    user = await tryFetch(supabaseAnonServer);
  }
  return user;
}

export interface SupabaseOpResult {
  success: boolean;
  error?: string;
  warning?: string;
}

/**
 * Saves/upserts a user record authoritatively into Supabase public.users
 */
export async function saveUserToSupabase(user: User): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] saveUserToSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured in server environment; record persisted to server authoritative store.');
    return {
      success: true,
      warning: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Persisted to server database.'
    };
  }
  try {
    const row = mapUserToSupabaseRow(user);
    const { data, error } = await supabaseServer
      .from('users')
      .upsert(row, { onConflict: 'id' })
      .select('id, email, role, status');

    if (error) {
      console.error('[Supabase DB] saveUserToSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    if (!data || data.length === 0) {
      return { success: false, error: `Supabase did not return confirmed record for user ${user.id}.` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] saveUserToSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Updates a user's role and onboarding state authoritatively in Supabase
 */
export async function updateUserRoleInSupabase(
  userId: string,
  role: string,
  onboardingStatus?: string,
  email?: string
): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] updateUserRoleInSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured in server environment; role saved authoritatively in server database.');
    return {
      success: true,
      warning: 'SUPABASE_SERVICE_ROLE_KEY is not configured in server environment. Role saved in server database.'
    };
  }
  try {
    const updatePayload: Record<string, any> = {
      role,
      updated_at: new Date().toISOString()
    };
    if (onboardingStatus) {
      updatePayload.onboarding_status = onboardingStatus;
    }
    if (onboardingStatus === 'not_started') {
      updatePayload.onboarding_approved_at = null;
      updatePayload.onboarding_approved_by = null;
      updatePayload.role_at_approval = null;
    }
    const { data, error } = await supabaseServer
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, role, onboarding_status');

    if (error) {
      console.error('[Supabase DB] updateUserRoleInSupabase error:', error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      if (email) {
        const emailRes = await supabaseServer
          .from('users')
          .update(updatePayload)
          .eq('email', email.toLowerCase().trim())
          .select('id, role, onboarding_status');
        if (emailRes.error) {
          return { success: false, error: emailRes.error.message };
        }
        if (emailRes.data && emailRes.data.length > 0) {
          return { success: true };
        }
      }
      // If user row does not exist in Supabase yet, attempt to upsert
      const { data: upsertData, error: upsertErr } = await supabaseServer
        .from('users')
        .upsert({
          id: userId,
          email: email ? email.toLowerCase().trim() : `${userId}@placeholder.local`,
          ...updatePayload
        }, { onConflict: 'id' })
        .select('id, role, onboarding_status');

      if (!upsertErr && upsertData && upsertData.length > 0) {
        return { success: true };
      }
      return { success: false, error: upsertErr?.message || `User with ID ${userId} was not found or updated in Supabase users table.` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] updateUserRoleInSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Updates a user's account status (ACTIVE, SUSPENDED, PAUSED) authoritatively in Supabase
 */
export async function updateUserStatusInSupabase(userId: string, status: string): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] updateUserStatusInSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; updated in server database.');
    return { success: true, warning: 'SUPABASE_SERVICE_ROLE_KEY not configured. Saved in server database.' };
  }
  try {
    const { data, error } = await supabaseServer
      .from('users')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, status');

    if (error) {
      console.error('[Supabase DB] updateUserStatusInSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    if (!data || data.length === 0) {
      return { success: false, error: `User with ID ${userId} was not found in Supabase.` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] updateUserStatusInSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Updates a user's profile avatar authoritatively in Supabase
 */
export async function updateUserAvatarInSupabase(userId: string, avatarUrl: string): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] updateUserAvatarInSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; updated in server database.');
    return { success: true, warning: 'SUPABASE_SERVICE_ROLE_KEY not configured. Saved in server database.' };
  }
  try {
    const { data, error } = await supabaseServer
      .from('users')
      .update({
        avatar_url: avatarUrl,
        profile_photo: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, avatar_url');

    if (error) {
      console.error('[Supabase DB] updateUserAvatarInSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    if (!data || data.length === 0) {
      return { success: false, error: `User with ID ${userId} was not found in Supabase.` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] updateUserAvatarInSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Updates a user's onboarding review status authoritatively in Supabase
 */
export async function updateUserOnboardingInSupabase(
  userId: string,
  onboardingStatus: string,
  approvedBy?: string,
  roleAtApproval?: string,
  email?: string
): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] updateUserOnboardingInSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; updated in server database.');
    return { success: true, warning: 'SUPABASE_SERVICE_ROLE_KEY not configured. Saved in server database.' };
  }
  try {
    const updatePayload: Record<string, any> = {
      onboarding_status: onboardingStatus,
      updated_at: new Date().toISOString()
    };
    if (onboardingStatus === 'approved') {
      updatePayload.onboarding_approved_at = new Date().toISOString();
      if (approvedBy) updatePayload.onboarding_approved_by = approvedBy;
      if (roleAtApproval) updatePayload.role_at_approval = roleAtApproval;
    } else if (onboardingStatus === 'not_started' || onboardingStatus === 'correction_required' || onboardingStatus === 'pending') {
      updatePayload.onboarding_approved_at = null;
      updatePayload.onboarding_approved_by = null;
      updatePayload.role_at_approval = null;
    }
    const { data, error } = await supabaseServer
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, onboarding_status');

    if (error) {
      console.error('[Supabase DB] updateUserOnboardingInSupabase error:', error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      if (email) {
        const emailRes = await supabaseServer
          .from('users')
          .update(updatePayload)
          .eq('email', email.toLowerCase().trim())
          .select('id, onboarding_status');
        if (emailRes.error) {
          return { success: false, error: emailRes.error.message };
        }
        if (emailRes.data && emailRes.data.length > 0) {
          return { success: true };
        }
      }
      return { success: false, error: `User with ID ${userId} was not found or updated in Supabase users table.` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] updateUserOnboardingInSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Permanently deletes a user from Supabase public.users and associated tables
 */
export async function deleteUserFromSupabase(userId: string): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] deleteUserFromSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; deleted from server database.');
    return { success: true, warning: 'SUPABASE_SERVICE_ROLE_KEY not configured. Deleted from server database.' };
  }
  try {
    // Delete foreign relations first (if cascade is not enabled)
    await Promise.allSettled([
      supabaseServer.from('wallets').delete().eq('user_id', userId),
      supabaseServer.from('transactions').delete().eq('user_id', userId),
      supabaseServer.from('funding_requests').delete().eq('user_id', userId),
      supabaseServer.from('service_requests').delete().eq('user_id', userId),
      supabaseServer.from('agent_onboarding').delete().eq('user_id', userId)
    ]);

    const { error } = await supabaseServer
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('[Supabase DB] deleteUserFromSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] deleteUserFromSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Fetch wallet balance directly from Supabase
 */
export async function fetchSupabaseWalletByUserId(userId: string): Promise<Wallet | null> {
  const tryFetch = async (client: SupabaseClient | null) => {
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return mapSupabaseRowToWallet(data);
      }
    } catch (err: any) {
      console.warn('[Supabase DB] fetchSupabaseWalletByUserId notice:', err.message || err);
    }
    return null;
  };

  let wallet = await tryFetch(supabaseServer);
  if (!wallet && supabaseAnonServer && supabaseAnonServer !== supabaseServer) {
    wallet = await tryFetch(supabaseAnonServer);
  }
  return wallet;
}

/**
 * Updates wallet balance authoritatively in Supabase
 */
export async function saveWalletToSupabase(wallet: Wallet): Promise<SupabaseOpResult> {
  const client = supabaseServer || supabaseAnonServer;
  if (!client) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] saveWalletToSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; wallet persisted to server authoritative store.');
    return { success: true, warning: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Persisted to server database.' };
  }
  try {
    const row = mapWalletToSupabaseRow(wallet);
    const { error } = await client
      .from('wallets')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      console.error('[Supabase DB] saveWalletToSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] saveWalletToSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Inserts transaction record authoritatively in Supabase
 */
export async function insertTransactionToSupabase(txn: WalletTransaction): Promise<SupabaseOpResult> {
  const client = supabaseServer || supabaseAnonServer;
  if (!client) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] insertTransactionToSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; transaction persisted to server authoritative store.');
    return { success: true, warning: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Persisted to server database.' };
  }
  try {
    const row = mapTransactionToSupabaseRow(txn);
    const { error } = await client
      .from('transactions')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase DB] insertTransactionToSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] insertTransactionToSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Inserts funding request record authoritatively in Supabase
 */
export async function insertFundingRequestToSupabase(req: FundingRequest): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    return {
      success: false,
      error: 'Privileged database write rejected: SUPABASE_SERVICE_ROLE_KEY is required to record funding requests.'
    };
  }
  try {
    const row = mapFundingRequestToSupabaseRow(req);
    const { error } = await supabaseServer
      .from('funding_requests')
      .upsert(row, { onConflict: 'reference' });

    if (error) {
      console.error('[Supabase DB] insertFundingRequestToSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] insertFundingRequestToSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Updates funding request status authoritatively in Supabase
 */
export async function updateFundingRequestStatusInSupabase(
  reference: string,
  status: 'APPROVED' | 'REJECTED',
  reviewedBy: string,
  adminNote?: string
): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    return {
      success: false,
      error: 'Privileged database write rejected: SUPABASE_SERVICE_ROLE_KEY is required to update funding requests.'
    };
  }
  try {
    const { error } = await supabaseServer
      .from('funding_requests')
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        admin_note: adminNote || null
      })
      .eq('reference', reference);

    if (error) {
      console.error('[Supabase DB] updateFundingRequestStatusInSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] updateFundingRequestStatusInSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Saves customer service request authoritatively in Supabase
 */
export async function saveServiceRequestToSupabase(req: CustomerServiceRequest): Promise<SupabaseOpResult> {
  const client = supabaseServer || supabaseAnonServer;
  if (!client) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] saveServiceRequestToSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; request persisted to server authoritative store.');
    return {
      success: true,
      warning: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Persisted to server database.'
    };
  }
  try {
    const row = mapServiceRequestToSupabaseRow(req);
    const { error } = await client
      .from('service_requests')
      .upsert(row, { onConflict: 'ticket_id' });

    if (error) {
      console.error('[Supabase DB] saveServiceRequestToSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] saveServiceRequestToSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Inserts an audit log entry authoritatively in Supabase
 */
export async function insertAuditLogToSupabase(entry: AuditLog): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    return {
      success: false,
      error: 'Privileged database write rejected: SUPABASE_SERVICE_ROLE_KEY is required to record audit logs.'
    };
  }
  try {
    const { error } = await supabaseServer
      .from('audit_logs')
      .insert({
        id: entry.id,
        user_id: entry.userId || null,
        actor_name: entry.actorName,
        actor_role: entry.actorRole,
        action: entry.action,
        details: entry.details || null,
        reference: entry.reference || null,
        ip_address: entry.ipAddress || null,
        timestamp: entry.timestamp
      });

    if (error) {
      console.error('[Supabase DB] insertAuditLogToSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] insertAuditLogToSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

// =========================================================================
// SERVICES CATALOGUE (SUPABASE PERSISTENCE & LIVE QUERYING)
// =========================================================================

export function mapSupabaseRowToService(row: any): Service {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    price: Number(row.price || 0),
    agentPrice: row.agent_price !== null && row.agent_price !== undefined ? Number(row.agent_price) : undefined,
    status: row.status || 'ACTIVE',
    requiredFields: Array.isArray(row.required_fields) ? row.required_fields : [],
    icon: row.icon || 'ShieldCheck',
    category: row.category || 'General',
    serviceType: row.service_type || 'verification',
    providerMapping: row.provider_mapping || 'auto',
    defaultProvider: row.default_provider || undefined,
    displayOrder: typeof row.display_order === 'number' ? row.display_order : 99,
    allowedRoles: Array.isArray(row.allowed_roles) ? row.allowed_roles : ['USER', 'AGENT', 'ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN'],
    managedBy: row.managed_by || 'ALL_ADMINS',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

export function mapServiceToSupabaseRow(s: Service): Record<string, any> {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    description: s.description || null,
    price: Number(s.price || 0),
    agent_price: s.agentPrice !== undefined ? Number(s.agentPrice) : null,
    status: s.status || 'ACTIVE',
    required_fields: s.requiredFields || [],
    icon: s.icon || 'ShieldCheck',
    category: s.category || 'General',
    service_type: s.serviceType || 'verification',
    provider_mapping: s.providerMapping || 'auto',
    default_provider: s.defaultProvider || null,
    display_order: s.displayOrder !== undefined ? Number(s.displayOrder) : 99,
    allowed_roles: s.allowedRoles || ['USER', 'AGENT', 'ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN'],
    managed_by: s.managedBy || 'ALL_ADMINS',
    updated_at: new Date().toISOString()
  };
}

/**
 * Fetch all active services directly from Supabase public.services
 */
export async function fetchSupabaseServices(): Promise<Service[] | null> {
  const tryFetch = async (client: SupabaseClient | null) => {
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('services')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapSupabaseRowToService);
      }
      if (error) {
        console.warn('[Supabase DB] fetchSupabaseServices error with client:', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase DB] fetchSupabaseServices exception:', err.message || err);
    }
    return null;
  };

  let res = await tryFetch(supabaseServer);
  if (!res && supabaseAnonServer && supabaseAnonServer !== supabaseServer) {
    res = await tryFetch(supabaseAnonServer);
  }
  return res;
}

/**
 * Fetch a single service by code or id directly from Supabase public.services
 */
export async function fetchSupabaseServiceByCodeOrId(identifier: string): Promise<Service | null> {
  const tryFetch = async (client: SupabaseClient | null) => {
    if (!client) return null;
    const term = identifier.trim();
    const upper = term.toUpperCase();
    try {
      const { data, error } = await client
        .from('services')
        .select('*')
        .or(`id.eq.${term},code.eq.${upper}`)
        .maybeSingle();

      if (!error && data) {
        return mapSupabaseRowToService(data);
      }
      if (error) {
        console.warn('[Supabase DB] fetchSupabaseServiceByCodeOrId error:', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase DB] fetchSupabaseServiceByCodeOrId exception:', err.message || err);
    }
    return null;
  };

  let res = await tryFetch(supabaseServer);
  if (!res && supabaseAnonServer && supabaseAnonServer !== supabaseServer) {
    res = await tryFetch(supabaseAnonServer);
  }
  return res;
}

/**
 * Updates a service authoritatively in Supabase public.services
 */
export async function updateServiceInSupabase(
  serviceIdOrCode: string,
  updates: Partial<Service>
): Promise<SupabaseOpResult & { service?: Service }> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] updateServiceInSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; service updated in server authoritative database.');
    return { success: true, warning: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Persisted to server database.' };
  }

  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (updates.name !== undefined) updatePayload.name = String(updates.name).trim();
    if (updates.description !== undefined) updatePayload.description = String(updates.description).trim();
    if (updates.price !== undefined) updatePayload.price = Number(updates.price);
    if (updates.agentPrice !== undefined) updatePayload.agent_price = Number(updates.agentPrice);
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.category !== undefined) updatePayload.category = String(updates.category).trim();
    if (updates.icon !== undefined) updatePayload.icon = updates.icon;
    if (updates.displayOrder !== undefined) updatePayload.display_order = Number(updates.displayOrder);
    if (updates.providerMapping !== undefined) updatePayload.provider_mapping = updates.providerMapping;
    if (updates.defaultProvider !== undefined) updatePayload.default_provider = updates.defaultProvider;
    if (updates.requiredFields !== undefined) updatePayload.required_fields = updates.requiredFields;

    const term = serviceIdOrCode.trim();
    const upper = term.toUpperCase();

    const { data, error } = await supabaseServer
      .from('services')
      .update(updatePayload)
      .or(`id.eq.${term},code.eq.${upper}`)
      .select('*');

    if (error) {
      console.error('[Supabase DB] updateServiceInSupabase error:', error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: `Service '${serviceIdOrCode}' could not be updated in Supabase (0 rows modified). Verify database permissions and identifier.`
      };
    }

    const updatedService = mapSupabaseRowToService(data[0]);
    return { success: true, service: updatedService };
  } catch (err: any) {
    console.error('[Supabase DB] updateServiceInSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Creates / upserts a service authoritatively in Supabase public.services
 */
export async function saveServiceToSupabase(service: Service): Promise<SupabaseOpResult & { service?: Service }> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] saveServiceToSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; service persisted to server authoritative store.');
    return { success: true, warning: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Persisted to server database.' };
  }
  try {
    const row = mapServiceToSupabaseRow(service);
    const { data, error } = await supabaseServer
      .from('services')
      .upsert(row, { onConflict: 'id' })
      .select('*');

    if (error) {
      console.error('[Supabase DB] saveServiceToSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    if (!data || data.length === 0) {
      return { success: false, error: `Supabase did not return confirmed record for service ${service.code}.` };
    }
    return { success: true, service: mapSupabaseRowToService(data[0]) };
  } catch (err: any) {
    console.error('[Supabase DB] saveServiceToSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Deletes a service authoritatively from Supabase public.services
 */
export async function deleteServiceFromSupabase(serviceIdOrCode: string): Promise<SupabaseOpResult> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server client not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    return {
      success: false,
      error: 'Privileged database write rejected: SUPABASE_SERVICE_ROLE_KEY is required to delete services.'
    };
  }
  try {
    const term = serviceIdOrCode.trim();
    const upper = term.toUpperCase();
    const { error } = await supabaseServer
      .from('services')
      .delete()
      .or(`id.eq.${term},code.eq.${upper}`);

    if (error) {
      console.error('[Supabase DB] deleteServiceFromSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] deleteServiceFromSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

// =========================================================================
// AGENT ONBOARDING PERSISTENCE
// =========================================================================

export function mapAgentOnboardingToSupabaseRow(app: AgentAdminOnboarding): Record<string, any> {
  return {
    id: app.id,
    user_id: app.userId,
    user_email: app.userEmail,
    user_full_name: app.userFullName,
    target_role: app.targetRole,
    full_name: app.fullName,
    dob: app.dob || null,
    phone1: app.phone1,
    phone2: app.phone2 || null,
    profile_photo: app.profilePhoto,
    nin: app.nin,
    certificates: app.certificates || [],
    satisfaction_title: app.satisfactionTitle || 'Accredited Operator',
    nin_verified: Boolean(app.ninVerified),
    nin_verified_at: app.ninVerifiedAt || null,
    nin_result_data: app.ninResultData || {},
    nin_photo_url: app.ninPhotoUrl || null,
    nin_full_name: app.ninFullName || null,
    nin_dob: app.ninDob || null,
    nin_comparison_match: Boolean(app.ninComparisonMatch),
    name_match: Boolean(app.nameMatch),
    dob_match: Boolean(app.dobMatch),
    verification_message: app.verificationMessage || null,
    status: app.status || 'pending',
    rejection_reason: app.rejectionReason || null,
    correction_requested: Boolean(app.correctionRequested),
    correction_message: app.correctionMessage || null,
    submitted_at: app.submittedAt || new Date().toISOString(),
    reviewed_at: app.reviewedAt || null,
    reviewed_by: app.reviewedBy || null,
    reviewed_by_name: app.reviewedByName || null,
    reviewed_by_role: app.reviewedByRole || null,
    role_at_approval: app.roleAtApproval || null,
    created_at: app.submittedAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function mapSupabaseRowToAgentOnboarding(row: any): AgentAdminOnboarding {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userFullName: row.user_full_name,
    targetRole: row.target_role || 'AGENT',
    fullName: row.full_name,
    dob: row.dob || '',
    phone1: row.phone1,
    phone2: row.phone2 || undefined,
    profilePhoto: row.profile_photo || '',
    nin: row.nin,
    certificates: Array.isArray(row.certificates) ? row.certificates : [],
    satisfactionTitle: row.satisfaction_title || 'Accredited Operator',
    ninVerified: Boolean(row.nin_verified),
    ninVerifiedAt: row.nin_verified_at || undefined,
    ninResultData: row.nin_result_data || {},
    ninPhotoUrl: row.nin_photo_url || undefined,
    ninFullName: row.nin_full_name || undefined,
    ninDob: row.nin_dob || undefined,
    ninComparisonMatch: Boolean(row.nin_comparison_match),
    nameMatch: Boolean(row.name_match),
    dobMatch: Boolean(row.dob_match),
    verificationMessage: row.verification_message || undefined,
    status: row.status || 'pending',
    rejectionReason: row.rejection_reason || undefined,
    correctionRequested: Boolean(row.correction_requested),
    correctionMessage: row.correction_message || undefined,
    submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
    reviewedAt: row.reviewed_at || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewedByName: row.reviewed_by_name || undefined,
    reviewedByRole: row.reviewed_by_role || undefined,
    roleAtApproval: row.role_at_approval || undefined
  };
}

export async function saveOnboardingApplicationToSupabase(app: AgentAdminOnboarding): Promise<SupabaseOpResult> {
  if (!supabaseServer) return { success: false, error: 'Supabase client not initialized.' };
  if (!isSupabaseServiceRoleActive()) {
    console.warn('[Supabase DB] saveOnboardingApplicationToSupabase notice: SUPABASE_SERVICE_ROLE_KEY is not configured; application saved to server database.');
    return { success: true, warning: 'SUPABASE_SERVICE_ROLE_KEY not configured. Saved in server database.' };
  }
  try {
    const row = mapAgentOnboardingToSupabaseRow(app);
    const { error } = await supabaseServer
      .from('agent_onboarding')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase DB] saveOnboardingApplicationToSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase DB] saveOnboardingApplicationToSupabase exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function fetchSupabaseOnboardingApplications(): Promise<AgentAdminOnboarding[] | null> {
  if (!supabaseServer) return null;
  try {
    const { data, error } = await supabaseServer
      .from('agent_onboarding')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(mapSupabaseRowToAgentOnboarding);
    }
  } catch (err: any) {
    console.warn('[Supabase DB] fetchSupabaseOnboardingApplications notice:', err.message || err);
  }
  return null;
}

// =========================================================================
// SUPABASE STORAGE AVATAR PERSISTENCE
// =========================================================================

export async function uploadAvatarToSupabaseStorage(
  userId: string,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase client is not initialized.' };
  }
  if (!isSupabaseServiceRoleActive()) {
    return {
      success: false,
      error: 'Privileged storage write rejected: SUPABASE_SERVICE_ROLE_KEY is required on the server to upload photos to Supabase Storage.'
    };
  }

  try {
    const filePath = `avatars/${userId}/${fileName}`;
    const { error } = await supabaseServer.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('[Supabase Storage] upload error:', error.message);
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = supabaseServer.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      return { success: false, error: 'Failed to retrieve public URL from Supabase storage.' };
    }

    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    console.error('[Supabase Storage] upload exception:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Legacy compatibility helpers for existing callers
 */
export async function ensureUserInSupabase(user: {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  status?: string;
  avatarUrl?: string;
}): Promise<void> {
  await saveUserToSupabase(user as any);
}

export async function getSupabaseUserProfile(userId: string): Promise<any | null> {
  const u = await fetchSupabaseUserById(userId);
  return u ? mapUserToSupabaseRow(u) : null;
}

export async function syncWalletToSupabase(wallet: {
  id: string;
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalSpent: number;
}): Promise<void> {
  await saveWalletToSupabase(wallet as Wallet);
}
