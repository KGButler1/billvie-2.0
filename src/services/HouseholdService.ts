import { supabase } from '@/lib/supabase';
import { fetchMyHouseholds, setCurrentHousehold, HouseholdMembership } from './supabaseData';

export class HouseholdService {
  static async listMemberships(): Promise<HouseholdMembership[]> {
    return fetchMyHouseholds();
  }

  static async createOwnHousehold(name?: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || '';
    const { data, error } = await supabase.rpc('create_household_with_owner', {
      p_name: name || null,
      p_user_email: email,
    });
    if (error) throw error;
    return data as string;
  }

  static switchTo(householdId: string): void {
    setCurrentHousehold(householdId);
  }
}
