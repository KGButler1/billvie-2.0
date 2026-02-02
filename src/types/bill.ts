export type PaymentMethod = 
  | 'direct_debit'
  | 'credit_card'
  | 'zelle'
  | 'bpay'
  | 'check'
  | 'cash'
  | 'transfer';

export type BillStatus = 'pending' | 'paid' | 'overdue' | 'due_soon';

export type BillCategory = 
  | 'utilities'
  | 'subscriptions'
  | 'insurance'
  | 'rent_mortgage'
  | 'loans'
  | 'services'
  | 'other';

export type RecurringInterval = 'one_time' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export type ResponsibleParty = 'me' | 'partner' | 'roommate' | 'parent' | 'other';

export interface Bill {
  id: string;
  name: string;
  amount?: number;
  dueDate?: string; // ISO date string
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
  paymentMethod?: PaymentMethod | string; // Supports custom payment methods
  category?: BillCategory | string; // Supports custom categories
  responsibleParty?: ResponsibleParty | string; // Supports custom responsible parties
  isAutoDebited?: boolean;
  status: BillStatus;
  paidDate?: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Event Types
export type EventType = 
  | 'travel'
  | 'wedding'
  | 'moving'
  | 'renovation'
  | 'birthday'
  | 'custom';

export type EventStatus = 'planning' | 'active' | 'completed' | 'archived';

export interface EventExpense {
  id: string;
  eventId: string;
  name: string;
  amount: number;
  category: string;
  paidDate?: string;
  isPaid: boolean;
  createdAt: string;
}

export interface Event {
  id: string;
  name: string;
  type: EventType;
  budget?: number;
  startDate?: string;
  endDate?: string;
  status: EventStatus;
  expenses: EventExpense[];
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userType: 'anonymous' | 'free' | 'paid' | 'accountant';
  hasSeenOnboarding: boolean;
  hasEventsAccess: boolean;
  theme: 'light' | 'dark' | 'system';
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  direct_debit: 'Direct Debit',
  credit_card: 'Credit Card',
  zelle: 'Zelle',
  bpay: 'BPay',
  check: 'Check',
  cash: 'Cash',
  transfer: 'Transfer',
};

export const CATEGORY_LABELS: Record<BillCategory, string> = {
  utilities: 'Utilities',
  subscriptions: 'Subscriptions',
  insurance: 'Insurance',
  rent_mortgage: 'Rent/Mortgage',
  loans: 'Loans',
  services: 'Services',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<BillCategory, string> = {
  utilities: 'hsl(200, 70%, 50%)',
  subscriptions: 'hsl(280, 60%, 55%)',
  insurance: 'hsl(145, 60%, 42%)',
  rent_mortgage: 'hsl(20, 70%, 50%)',
  loans: 'hsl(0, 60%, 50%)',
  services: 'hsl(38, 90%, 50%)',
  other: 'hsl(220, 10%, 50%)',
};

export const RECURRING_LABELS: Record<RecurringInterval, string> = {
  one_time: 'One-time',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  travel: 'Travel/Trip',
  wedding: 'Wedding',
  moving: 'Moving/Relocation',
  renovation: 'Home Renovation',
  birthday: 'Birthday/Party',
  custom: 'Custom',
};

export const RESPONSIBLE_PARTY_LABELS: Record<ResponsibleParty, string> = {
  me: 'Me',
  partner: 'Partner',
  roommate: 'Roommate',
  parent: 'Parent',
  other: 'Other',
};

export const BILL_LIMITS = {
  free: 25,
  paid: Infinity,
  anonymous: 25,
  accountant: Infinity,
} as const;

export const EVENT_LIMITS = {
  free: 3,
  paid: Infinity,
  anonymous: 3,
  accountant: Infinity,
} as const;
