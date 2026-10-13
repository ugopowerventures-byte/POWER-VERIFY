import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://yhwtkowbvbhfmskyxtju.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlod3Rrb3didmJoZm1za3l4dGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxOTgwNjcsImV4cCI6MjEwNTc3NDA2N30.81ncPny9dbX5o_IO76daPt0TymIMCuVLbl60hHP7hNo';

function resolveSupabaseUrl(): string {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  if (
    (envUrl.startsWith('http://') || envUrl.startsWith('https://')) &&
    !envUrl.includes('your-project-id') &&
    !envUrl.includes('your-project') &&
    !envUrl.includes('placeholder')
  ) {
    return envUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }
  if (envUrl.startsWith('eyJ') && envUrl.includes('.')) {
    try {
      const parts = envUrl.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.ref && !payload.ref.includes('your-project') && !payload.ref.includes('placeholder')) {
          return `https://${payload.ref}.supabase.co`;
        }
      }
    } catch {}
  }
  return defaultUrl;
}

export const supabaseUrl = resolveSupabaseUrl();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const supabaseAnonKey =
  rawAnonKey &&
  !rawAnonKey.includes('your-anon-public-key') &&
  !rawAnonKey.includes('placeholder') &&
  rawAnonKey.length > 20
    ? rawAnonKey
    : defaultAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-public-key')
);

// Active client instance
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  servicesCount: number;
  error?: string;
}> {
  if (!supabase) {
    return { connected: false, servicesCount: 0, error: 'Supabase client not initialized' };
  }
  try {
    const { data, count, error } = await supabase
      .from('services')
      .select('id, code, name', { count: 'exact' });

    if (error) {
      return { connected: false, servicesCount: 0, error: error.message };
    }
    return {
      connected: true,
      servicesCount: count || (data ? data.length : 0)
    };
  } catch (err: any) {
    return { connected: false, servicesCount: 0, error: err.message || String(err) };
  }
}
