import { PersonRole } from '@/types/people';
import { PeopleService } from './PeopleService';
import { UserService } from './UserService';

// Free-tier rule: we count PEOPLE, not grants. One free household person who may
// see any combination of scopes. The alternative — one person per scope — creates
// walls users can't predict ("bills with your spouse, documents with your son,
// but not bills with your son") and stops making sense once Stage C adds
// per-item grants. If this is ever reversed, this function is the only place
// that changes.
export const EntitlementService = {
  canAddTrustedPerson(role: PersonRole): { allowed: boolean; reason?: string } {
    // Advisors and accountants are always free, however many are added.
    if (role === 'advisor' || role === 'accountant') return { allowed: true };

    const settings = UserService.getSettings();
    const isPaid = settings.userType === 'paid' || settings.userType === 'accountant';
    if (isPaid) return { allowed: true };

    const householdCount = PeopleService.getRaw().filter(
      (p) =>
        p.role === 'household' &&
        p.accessLevel !== 'owner' &&
        (p.status === 'invited' || p.status === 'active')
    ).length;

    if (householdCount === 0) return { allowed: true };

    return {
      allowed: false,
      reason: 'Free includes one trusted person. Add anyone else with Pro.',
    };
  },
};
