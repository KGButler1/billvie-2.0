import { getHouseholdId } from '@/services/supabaseData';

export interface OnboardingState {
  completed: boolean;
  completedAt?: string;
  firstItemAdded: boolean;
  sharingOffered: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  firstItemAdded: false,
  sharingOffered: false,
};

const STORAGE_PREFIX = 'billvie_onboarding';

function keyForHousehold(householdId: string): string {
  return `${STORAGE_PREFIX}:${householdId}`;
}

export const OnboardingService = {
  async getState(): Promise<OnboardingState> {
    const householdId = await getHouseholdId();
    const stored = localStorage.getItem(keyForHousehold(householdId));
    return stored ? JSON.parse(stored) : DEFAULT_STATE;
  },

  async setState(state: Partial<OnboardingState>): Promise<void> {
    const householdId = await getHouseholdId();
    const current = await OnboardingService.getState();
    const updated = { ...current, ...state };
    localStorage.setItem(keyForHousehold(householdId), JSON.stringify(updated));
  },

  async isCompleted(): Promise<boolean> {
    return (await OnboardingService.getState()).completed;
  },

  async complete(): Promise<void> {
    await OnboardingService.setState({ completed: true, completedAt: new Date().toISOString() });
  },

  async reset(): Promise<void> {
    const householdId = await getHouseholdId();
    localStorage.removeItem(keyForHousehold(householdId));
  },
};
