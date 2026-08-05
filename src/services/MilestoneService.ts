const STORAGE_KEY = 'billvie_milestones';

export type MilestoneCategory = 'bills' | 'access' | 'financial' | 'people' | 'documents';

interface MilestoneState {
  counts: Record<MilestoneCategory, number>;
}

const DEFAULT_STATE: MilestoneState = {
  counts: { bills: 0, access: 0, financial: 0, people: 0, documents: 0 },
};

export const MILESTONE_MESSAGES: Record<MilestoneCategory, [string, string]> = {
  bills: [
    "Saved. That's one less thing anyone would have to guess.",
    "Another bill logged — your family's picture is getting clearer.",
  ],
  documents: [
    "First document logged — this is now something your family can find.",
    "Another document saved. That's one less thing to hunt for later.",
  ],
  access: [
    "Someone now has access. You're not the only one who knows.",
    "Another person invited. The circle of trust just grew.",
  ],
  financial: [
    "Financial detail saved — no one will have to guess where it's kept.",
    "Another piece of the financial picture, locked in.",
  ],
  people: [
    "Contact saved — someone to call, and now everyone knows who.",
    "Another key person added. The right people are easier to reach.",
  ],
};

export const MilestoneService = {
  getState(): MilestoneState {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    try {
      const parsed = JSON.parse(stored) as MilestoneState;
      return {
        counts: {
          bills: parsed.counts?.bills ?? 0,
          access: parsed.counts?.access ?? 0,
          financial: parsed.counts?.financial ?? 0,
          people: parsed.counts?.people ?? 0,
          documents: parsed.counts?.documents ?? 0,
        },
      };
    } catch {
      return DEFAULT_STATE;
    }
  },

  shouldCelebrate(category: MilestoneCategory): boolean {
    return this.getState().counts[category] < 2;
  },

  recordMilestone(category: MilestoneCategory): string | null {
    if (!this.shouldCelebrate(category)) {
      // Still increment the count, just don't celebrate
      const state = this.getState();
      state.counts[category] += 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return null;
    }

    const state = this.getState();
    const count = state.counts[category];
    state.counts[category] += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const messages = MILESTONE_MESSAGES[category];
    return messages[count] ?? null;
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
