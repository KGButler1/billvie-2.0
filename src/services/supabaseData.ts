import { supabase } from '@/lib/supabase';

// Resolves the current user's household_id from their trusted_person row.
// Cached per-session so repeated calls don't re-query.
let cachedHouseholdId: string | null = null;

export async function getHouseholdId(): Promise<string> {
  if (cachedHouseholdId) return cachedHouseholdId;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('trusted_person')
    .select('household_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data?.household_id) throw new Error('No household found for user');

  cachedHouseholdId = data.household_id;
  return cachedHouseholdId;
}

// Call after sign-out or household switch to force re-resolution.
export function clearHouseholdCache(): void {
  cachedHouseholdId = null;
}

// Maps camelCase keys used by the frontend to snake_case columns in Postgres.
// Used when inserting/updating — the inverse mapping is applied on read.
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snake] = value;
  }
  return result;
}

export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camel] = value;
  }
  return result;
}
