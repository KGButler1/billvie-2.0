// Event Expense Types
export type ExpenseUnit = 
  | 'tickets'
  | 'nights'
  | 'people'
  | 'items'
  | 'days'
  | 'hours'
  | 'months'
  | 'each';

export type CancellableStatus = 'yes' | 'no' | 'tbd';

export interface ExpenseQuantity {
  value: number;
  unit: ExpenseUnit;
}

export interface EventExpenseExtended {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  vendor?: string;
  amount: number;
  quantity?: ExpenseQuantity;
  category: string;
  date?: string; // Date of purchase/reservation
  paymentMethod?: string;
  isPaid: boolean;
  paidDate?: string;
  isCancellable: CancellableStatus;
  cancellationNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const EXPENSE_UNIT_LABELS: Record<ExpenseUnit, string> = {
  tickets: 'Tickets',
  nights: 'Nights',
  people: 'People',
  items: 'Items',
  days: 'Days',
  hours: 'Hours',
  months: 'Months',
  each: 'Each',
};

export const EXPENSE_UNIT_SINGULAR: Record<ExpenseUnit, string> = {
  tickets: 'ticket',
  nights: 'night',
  people: 'person',
  items: 'item',
  days: 'day',
  hours: 'hour',
  months: 'month',
  each: 'unit',
};

// Category icons/emojis mapping
export const CATEGORY_ICONS: Record<string, string> = {
  // Travel
  'Flights': '✈️',
  'Accommodation': '🏨',
  'Hotels': '🏨',
  'Transportation': '🚗',
  'Food & Dining': '🍽️',
  'Activities': '🎯',
  'Shopping': '🛍️',
  // Wedding
  'Venue': '🏛️',
  'Catering': '🍾',
  'Photography': '📸',
  'Attire': '👗',
  'Flowers': '💐',
  'Entertainment': '🎵',
  'Invitations': '💌',
  // Moving
  'Moving Company': '🚚',
  'Packing Supplies': '📦',
  'Deposits': '🔑',
  'Utilities Setup': '⚡',
  'Furniture': '🛋️',
  'Repairs': '🔧',
  // Renovation
  'Materials': '🧱',
  'Labor': '👷',
  'Permits': '📋',
  'Design': '🎨',
  'Appliances': '🔌',
  'Fixtures': '💡',
  // Birthday
  'Decorations': '🎈',
  'Cake': '🎂',
  'Gifts': '🎁',
  'Food & Drinks': '🍕',
  // General
  'General': '📌',
  'Other': '📝',
};

export interface CategorySummary {
  name: string;
  icon: string;
  totalAmount: number;
  itemCount: number;
  paidCount: number;
  cancellableCount: number;
  nonRefundableCount: number;
  tbdCount: number;
  totalQuantity?: number;
  quantityUnit?: ExpenseUnit;
  avgPerUnit?: number;
  expenses: EventExpenseExtended[];
}

export interface EventStats {
  totalPlanned: number;
  totalPaid: number;
  totalUnpaid: number;
  paidItemsCount: number;
  unpaidItemsCount: number;
  totalItems: number;
  cancellableCount: number;
  nonRefundableCount: number;
  tbdCount: number;
  totalDuration?: number; // in days
  budgetRemaining?: number;
  budgetPercentage: number;
  isOverBudget: boolean;
}
