import { supabase } from '@/lib/supabase';

export interface PendingInvite {
  token: string;
  householdName: string;
}

export async function checkPendingInvite(email: string): Promise<PendingInvite | null> {
  const { data, error } = await supabase
    .from('trusted_person')
    .select('invite_token, household_id, households(name)')
    .eq('email', email)
    .eq('status', 'invited')
    .maybeSingle();

  if (error || !data?.invite_token) return null;
  const householdName = (data as Record<string, unknown>).households as { name: string } | null;
  return { token: data.invite_token, householdName: householdName?.name || 'a household' };
}
