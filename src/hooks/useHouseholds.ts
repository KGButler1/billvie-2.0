import { useEffect, useState, useCallback } from 'react';
import { HouseholdService } from '@/services/HouseholdService';
import { HouseholdMembership } from '@/services/supabaseData';
import { useProfile } from '@/hooks/useProfile';

export const roleLabel = (accessLevel: string | null, role: string): string => {
  if (accessLevel === 'owner') return 'Owner';
  if (accessLevel === 'co_owner') return 'Co-owner';
  if (role === 'advisor') return 'Advisor';
  if (role === 'accountant') return 'Accountant';
  return 'Trusted';
};

export interface UseHouseholdsResult {
  households: HouseholdMembership[];
  loading: boolean;
  error: string | null;
  currentHouseholdId: string | null;
  hasOwnedHousehold: boolean;
  reload: () => void;
}

export const useHouseholds = (): UseHouseholdsResult => {
  const { profile } = useProfile();
  const [households, setHouseholds] = useState<HouseholdMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await HouseholdService.listMemberships();
      setHouseholds(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load households');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, profile?.householdId]);

  const currentHouseholdId = profile?.householdId ?? null;
  const hasOwnedHousehold = households.some((h) => h.accessLevel === 'owner');

  return {
    households,
    loading,
    error,
    currentHouseholdId,
    hasOwnedHousehold,
    reload: load,
  };
};
