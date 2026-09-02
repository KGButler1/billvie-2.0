import { BILL_LIMITS, EVENT_LIMITS, DOCUMENT_LIMITS, SCAN_LIMITS } from '@/types/bill';

export const PRO_PRICE = '$79';
export const PRO_PERIOD = '/year';

// Sandbox test price — must be swapped for the live price id before going to production.
export const PRO_PRICE_ID = 'price_1U5fsfS44PuuFX1PPZ4GliNV';

export const PAID_PLAN_STATUSES = ['active', 'trialing', 'past_due'] as const;

export const FREE_BILL_LIMIT = BILL_LIMITS.free;
export const FREE_EVENT_LIMIT = EVENT_LIMITS.free;
export const FREE_DOCUMENT_LIMIT = DOCUMENT_LIMITS.free;
export const FREE_SCAN_LIMIT = SCAN_LIMITS.free;

export const FREE_FEATURES = [
  `Up to ${FREE_BILL_LIMIT} bills`,
  `${FREE_EVENT_LIMIT} event${FREE_EVENT_LIMIT === 1 ? '' : 's'}`,
  `Up to ${FREE_DOCUMENT_LIMIT} important documents`,
  `${FREE_SCAN_LIMIT} free AI bill scans a month`,
  'Basic reminders',
  'Mobile access',
  'One trusted person, free',
  'Advisor & accountant sharing, always free',
];

export const PRO_FEATURES = [
  'Unlimited bills, events & documents',
  'Unlimited AI bill scanning',
  'Financial Snapshot — insurance, accounts, income & debts in one place',
  'Household Summary — a printable report for family or an executor',
  'Smart reminders',
  'Unlimited trusted people',
  'Tax export',
  'Advisor & accountant sharing, always free',
  'Priority support',
];
