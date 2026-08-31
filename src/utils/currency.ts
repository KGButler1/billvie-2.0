import { UserService } from '@/services/UserService';

/**
 * Formats a dollar amount consistently across the app.
 * Default: whole dollars, unless the amount has real cents (never hides real data).
 * If the user's "show cents" setting is on, always shows two decimals.
 */
export function formatCurrency(
  amount: number | undefined | null,
  opts?: { showCents?: boolean }
): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—';

  const alwaysShowCents = opts?.showCents ?? UserService.getSettings().showCents ?? false;
  const hasRealCents = Math.round(amount * 100) % 100 !== 0;
  const useCents = alwaysShowCents || hasRealCents;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: useCents ? 2 : 0,
    maximumFractionDigits: useCents ? 2 : 0,
  }).format(amount);
}
