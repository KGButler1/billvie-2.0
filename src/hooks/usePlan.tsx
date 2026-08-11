import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getHouseholdId } from '@/services/supabaseData';
import { supabase } from '@/lib/supabase';

export type PlanStatus = 'not_started' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';

interface PlanContextValue {
  isPaid: boolean;
  planStatus: PlanStatus | null;
  loading: boolean;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPlan = useCallback(async () => {
    setLoading(true);
    try {
      const householdId = await getHouseholdId();
      const { data, error } = await supabase
        .from('households')
        .select('plan_status')
        .eq('id', householdId)
        .maybeSingle();
      if (error) throw error;
      setPlanStatus((data?.plan_status as PlanStatus | null) ?? 'not_started');
    } catch (error) {
      console.error('Failed to load household plan:', error);
      setPlanStatus('not_started');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPlan();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshPlan();
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshPlan]);

  const value = useMemo(() => ({
    isPaid: planStatus === 'active' || planStatus === 'trialing',
    planStatus,
    loading,
    refreshPlan,
  }), [loading, planStatus, refreshPlan]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

export const usePlan = (): PlanContextValue => {
  const context = useContext(PlanContext);
  if (!context) throw new Error('usePlan must be used inside PlanProvider');
  return context;
};
