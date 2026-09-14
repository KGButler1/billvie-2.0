import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired — please sign in again.');
    this.name = 'SessionExpiredError';
  }
}

export async function getValidSession() {
  const { data: { session } } = await supabase.auth.getSession();
  const isExpiring = !session || (session.expires_at !== undefined &&
    session.expires_at * 1000 < Date.now() + 60_000);
  if (isExpiring) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session) {
      await supabase.auth.signOut();
      throw new SessionExpiredError();
    }
    return refreshed.session;
  }
  return session;
}
