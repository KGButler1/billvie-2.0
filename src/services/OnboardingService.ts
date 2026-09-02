const STORAGE_KEY = 'billvie_onboarding';

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

export const OnboardingService = {
  getState(): OnboardingState {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_STATE;
  },

  setState(state: Partial<OnboardingState>) {
    const current = OnboardingService.getState();
    const updated = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  isCompleted(): boolean {
    return OnboardingService.getState().completed;
  },

  complete() {
    OnboardingService.setState({ completed: true, completedAt: new Date().toISOString() });
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
