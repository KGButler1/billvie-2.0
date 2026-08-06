import { BillService } from '@/services/BillService';
import { AccessService } from '@/services/AccessService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { DocumentService } from '@/services/DocumentService';

export interface ReadinessCheck {
  id: string;
  label: string;
  covered: boolean;
  nudge: string;
  actionLabel: string;
  actionPath: string;
  viewPath: string;
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
  },
  {
    id: 'access',
    label: 'Someone has access',
    covered: AccessService.getActivePeople().length > 0,
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
  },
  {
    id: 'people',
    label: 'Key people',
    covered: KeyPeopleService.getAllKeyPeople().length > 0,
    nudge: 'Add who to call and why.',
    actionLabel: 'Add a key person',
    actionPath: '/key-people?add=1',
    viewPath: '/key-people',
  },
  {
    id: 'documents',
    label: 'Important documents',
    covered: DocumentService.getAll().length > 0,
    nudge: 'Add a document — even just a note about where the will is kept helps.',
    actionLabel: 'Add a document',
    actionPath: '/documents?add=1',
    viewPath: '/documents',
  },
];

export const getReadinessSummary = () => {
  const checks = getReadinessChecks();
  return {
    checks,
    covered: checks.filter(c => c.covered).length,
    total: checks.length,
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
