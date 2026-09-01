import { BILL_LIMITS, EVENT_LIMITS } from '@/types/bill';

export const PRO_PRICE = '$79';
export const PRO_PERIOD = '/year';

export const FREE_BILL_LIMIT = BILL_LIMITS.free;
export const FREE_EVENT_LIMIT = EVENT_LIMITS.free;

export const FREE_FEATURES = [
  `Up to ${FREE_BILL_LIMIT} bills`,
  `Up to ${FREE_EVENT_LIMIT} events`,
  'Basic reminders',
  'Mobile access',
  'One trusted person, free',
  'Advisor & accountant sharing, always free',
];

export const PRO_FEATURES = [
  'Unlimited bills',
  'Unlimited events',
  'Smart reminders',
  'Unlimited trusted people',
  'Tax export',
  'Advisor & accountant sharing, always free',
  'Priority support',
];
