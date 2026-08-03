import { PaymentCard } from '@/types/paymentCard';

// End of the expiry month is the real cut-off — a 06/2026 card works all through June.
const expiryEnd = (card: Pick<PaymentCard, 'expiryMonth' | 'expiryYear'>): Date | undefined => {
  if (!card.expiryMonth || !card.expiryYear) return undefined;
  return new Date(card.expiryYear, card.expiryMonth, 1); // first day of the following month
};

export const isCardExpired = (card?: Pick<PaymentCard, 'expiryMonth' | 'expiryYear'>): boolean => {
  if (!card) return false;
  const end = expiryEnd(card);
  if (!end) return false;
  return Date.now() >= end.getTime();
};

export const isCardExpiringSoon = (
  card?: Pick<PaymentCard, 'expiryMonth' | 'expiryYear'>,
  thresholdDays = 60
): boolean => {
  if (!card) return false;
  const end = expiryEnd(card);
  if (!end) return false;
  const ms = end.getTime() - Date.now();
  return ms > 0 && ms <= thresholdDays * 24 * 60 * 60 * 1000;
};

export const cardExpiryFlag = (
  card?: Pick<PaymentCard, 'expiryMonth' | 'expiryYear'>,
  thresholdDays = 60
): 'expired' | 'expiring_soon' | null => {
  if (isCardExpired(card)) return 'expired';
  if (isCardExpiringSoon(card, thresholdDays)) return 'expiring_soon';
  return null;
};

export const CARD_FLAG_LABELS: Record<'expired' | 'expiring_soon', string> = {
  expired: 'Card expired',
  expiring_soon: 'Card expiring',
};
