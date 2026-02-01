export type PaymentMethod = 
  | 'direct_debit'
  | 'credit_card'
  | 'zelle'
  | 'bpay'
  | 'check'
  | 'cash'
  | 'transfer';

export type BillStatus = 'pending' | 'paid' | 'overdue' | 'due_soon';

export interface Bill {
  id: string;
  name: string;
  amount?: number;
  dueDate?: string; // ISO date string
  isRecurring: boolean;
  recurringInterval?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  paymentMethod?: PaymentMethod;
  status: BillStatus;
  paidDate?: string;
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
