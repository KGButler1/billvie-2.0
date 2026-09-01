// A payment card is a *reference object*, not a payment instrument.
// Deliberately no card number, no last-4, no CVV — nickname + expiry only.
export interface PaymentCard {
  id: string;
  nickname: string; // "Amex Gold", "the Discover card" — free text
  expiryMonth?: number; // 1-12
  expiryYear?: number;
  notes?: string;
  deletedAt?: string; // Soft delete — recoverable from Recently Deleted for 30 days
  createdAt: string;
  updatedAt: string;
}

export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const formatCardExpiry = (card: Pick<PaymentCard, 'expiryMonth' | 'expiryYear'>): string | undefined => {
  if (!card.expiryMonth || !card.expiryYear) return undefined;
  return `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`;
};
