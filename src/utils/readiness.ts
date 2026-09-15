import { BillService } from '@/services/BillService';
import { AccessService } from '@/services/AccessService';
import { ExclusionService } from '@/services/ExclusionService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { DocumentService } from '@/services/DocumentService';
import { getAccessState } from '@/utils/accessState';
import { PeopleService } from '@/services/PeopleService';
import { AccessScope, PersonRole } from '@/types/people';

export interface ReadinessCheck {
  id: string;
  label: string;
  covered: boolean;
  pending?: boolean;
  nudge: string;
  actionLabel: string;
  actionPath: string;
  viewPath: string;
  sharedWithCount?: number;
  shareScope?: AccessScope;
}

const PROFESSIONAL_SCOPES: Record<PersonRole, AccessScope[]> = {
  household: [],
  advisor: ['financial_info'],
  accountant: ['tax_documents'],
};

function countPeopleWhoCanSeeScopeForRole(scope: AccessScope): number {
  const people = PeopleService.getAll().filter(
    (p) => p.status === 'active' && p.accessLevel !== 'owner',
  );
  return people.filter((p) => {
    if (p.accessLevel === 'co_owner') return true;
    const allowedScopes = PROFESSIONAL_SCOPES[p.role as PersonRole] ?? [];
    if (p.role !== 'household' && !allowedScopes.includes(scope)) return false;
    if (ExclusionService.isWholeScopeExcluded(p.id, scope)) return false;
    return AccessService.hasWholeScope(p.id, scope);
  }).length;
}

// Pure read-only aggregation — nothing here writes to any service.
export const getReadinessChecks = (): ReadinessCheck[] => [
  {
    id: 'bills',
    label: 'Bills tracked',
    covered: BillService.getAllBills().length > 0,
    nudge: 'Add your first bill so someone knows what\'s running.',
    actionLabel: 'Add a bill',
    actionPath: '/bills?add=bill',
    viewPath: '/bills',
    shareScope: 'bills',
    sharedWithCount: countPeopleWhoCanSeeScopeForRole('bills'),
  },
  {
    id: 'access',
    label: 'Someone has access',
    covered: AccessService.getActivePeople().length > 0,
    pending: getAccessState() === 'pending',
    nudge: 'No one else can see any of this yet.',
    actionLabel: 'Share with someone',
    actionPath: '/people',
    viewPath: '/people',
  },
  {
    id: 'financial',
    label: 'Financial snapshot',
    covered:
      FinancialInfoService.getInsurance().length > 0 ||
      FinancialInfoService.getSuperannuation().length > 0,
    nudge: 'Add insurance or an account so they\'re not a mystery later.',
    actionLabel: 'Add insurance or an account',
    actionPath: '/financial',
    viewPath: '/financial',
    shareScope: 'financial_info',
    sharedWithCount: countPeopleWhoCanSeeScopeForRole('financial_info'),
  },
  {
    id: 'people',
    label: 'Key people',
    covered: KeyPeopleService.getAllKeyPeople().length > 0,
    nudge: 'Add who to call and why.',
    actionLabel: 'Add a key person',
    actionPath: '/key-people?add=1',
    viewPath: '/key-people',
    shareScope: 'key_people',
    sharedWithCount: countPeopleWhoCanSeeScopeForRole('key_people'),
  },
  {
    id: 'documents',
    label: 'Important documents',
    covered: DocumentService.getAll().length > 0,
    nudge: 'Add a document — even just a note about where the will is kept helps.',
    actionLabel: 'Add a document',
    actionPath: '/documents?add=1',
    viewPath: '/documents',
    shareScope: 'documents',
    sharedWithCount: countPeopleWhoCanSeeScopeForRole('documents'),
  },
];

export const getReadinessSummary = () => {
  const checks = getReadinessChecks();
  const coveredCount = checks.filter(c => c.covered).length;
  const sharedZeroCount = checks.filter(
    (c) => c.covered && c.shareScope && (c.sharedWithCount ?? 0) === 0,
  ).length;
  return {
    checks,
    covered: coveredCount,
    total: checks.length,
    sharedZeroCount,
  };
};

const DISMISS_KEY = 'billvie_readiness_card_dismissed';

export const isReadinessCardDismissed = (): boolean =>
  localStorage.getItem(DISMISS_KEY) === 'true';

export const dismissReadinessCard = (): void => {
  localStorage.setItem(DISMISS_KEY, 'true');
};

export const resetReadinessCard = (): void => {
  localStorage.removeItem(DISMISS_KEY);
};
