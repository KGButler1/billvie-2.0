const STORAGE_KEY = 'billvie_onboarding';
const NUDGE_KEY = 'billvie_nudges';

export interface OnboardingState {
  completed: boolean;
  completedAt?: string;
  firstItemAdded: boolean;
  sharingOffered: boolean;
}

export interface NudgeState {
  startedAt: string;
  dismissed: string[];
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
    // Start nudge timer
    const nudgeState: NudgeState = { startedAt: new Date().toISOString(), dismissed: [] };
    localStorage.setItem(NUDGE_KEY, JSON.stringify(nudgeState));
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NUDGE_KEY);
  },

  // Nudges
  getNudgeState(): NudgeState | null {
    const stored = localStorage.getItem(NUDGE_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  dismissNudge(nudgeId: string) {
    const state = OnboardingService.getNudgeState();
    if (state) {
      state.dismissed.push(nudgeId);
      localStorage.setItem(NUDGE_KEY, JSON.stringify(state));
    }
  },

  getActiveNudges(): string[] {
    const state = OnboardingService.getNudgeState();
    if (!state) return [];

    const allNudges = [
      'add_contact',
      'upload_document',
      'add_another_bill',
      'invite_someone',
    ];

    return allNudges.filter(n => !state.dismissed.includes(n));
  },
};
