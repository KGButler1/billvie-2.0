import { Event } from '@/types/bill';

/**
 * Timezone-safe date helpers for events.
 *
 * The events table stores start_date / end_date as timestamptz. Users are in
 * Australia (UTC+10/+11). When a user picks "14 Mar 2027" we must store and
 * read back exactly that date — it must never shift by a day due to UTC
 * conversion. These helpers read/write date-only strings (YYYY-MM-DD) and
 * convert to/from timestamptz by anchoring to midday UTC, which is safe for
 * any timezone between UTC-12 and UTC+14.
 */

/** Parse a YYYY-MM-DD string into a Date at midday UTC (no day shift). */
function parseDateMidday(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Format a timestamptz string from the DB into a YYYY-MM-DD date-only string. */
export function toDateString(timestamptz: string | undefined | null): string | undefined {
  if (!timestamptz) return undefined;
  const d = new Date(timestamptz);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Convert a YYYY-MM-DD string into a timestamptz ISO string for DB writes. */
export function toTimestamptz(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  return parseDateMidday(dateStr).toISOString();
}

/** Convert a month string (YYYY-MM) into a timestamptz for the 1st of that month. */
export function monthToTimestamptz(monthStr: string | undefined | null): string | null {
  if (!monthStr) return null;
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 12, 0, 0)).toISOString();
}

/** Get the last moment of a month for "is past" comparison. Returns a Date in UTC. */
function endOfMonth(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0 + 1, 0, 23, 59, 59));
}

/**
 * Determine whether an event's date(s) have passed.
 * Uses end_date if present, otherwise start_date.
 * For month precision, the event is past after the end of that month.
 * Returns false for undated events.
 */
export function isEventPast(event: Event): boolean {
  const refDate = event.endDate || event.startDate;
  if (!refDate) return false;

  const d = new Date(refDate);

  if (event.datePrecision === 'month') {
    const endOfMo = endOfMonth(d.getUTCFullYear(), d.getUTCMonth());
    return new Date() > endOfMo;
  }

  return new Date() > d;
}

/**
 * Whether an event should appear in the "past" section of the events list.
 * True if status is completed/archived, or if isEventPast returns true
 * (auto-complete by date for planning/active events).
 */
export function isEventInPast(event: Event): boolean {
  if (event.status === 'completed' || event.status === 'archived') return true;
  return isEventPast(event);
}

/** Whether an event is auto-completed (date passed but status is still planning/active). */
export function isAutoCompleted(event: Event): boolean {
  return (event.status === 'planning' || event.status === 'active') && isEventPast(event);
}

/** Effective status for display: auto-completed events show as "Completed". */
export function effectiveStatus(event: Event): string {
  if (isAutoCompleted(event)) return 'completed';
  return event.status;
}

/**
 * Format an event's date range for display.
 * Returns undefined for undated events.
 *
 * Formats:
 * - "14 Mar 2027" (day precision, single date)
 * - "Mar 2027" (month precision, single date)
 * - "14–21 Mar 2027" (same month range)
 * - "14 Mar – 3 Apr 2027" (cross-month range)
 * - "Mar–Apr 2027" (month precision range)
 */
export function formatEventDate(event: Event): string | undefined {
  const start = event.startDate;
  if (!start) return undefined;

  const startD = new Date(start);
  const endD = event.endDate ? new Date(event.endDate) : null;
  const monthPrec = event.datePrecision === 'month';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = (d: Date) => months[d.getUTCMonth()];
  const y = (d: Date) => d.getUTCFullYear();
  const day = (d: Date) => d.getUTCDate();

  if (monthPrec && !endD) {
    return `${m(startD)} ${y(startD)}`;
  }

  if (monthPrec && endD) {
    if (y(startD) === y(endD) && startD.getUTCMonth() === endD.getUTCMonth()) {
      return `${m(startD)} ${y(startD)}`;
    }
    if (y(startD) === y(endD)) {
      return `${m(startD)}–${m(endD)} ${y(startD)}`;
    }
    return `${m(startD)} ${y(startD)} – ${m(endD)} ${y(endD)}`;
  }

  if (!endD) {
    return `${day(startD)} ${m(startD)} ${y(startD)}`;
  }

  // Day precision with range
  if (y(startD) === y(endD) && startD.getUTCMonth() === endD.getUTCMonth()) {
    return `${day(startD)}–${day(endD)} ${m(startD)} ${y(startD)}`;
  }
  if (y(startD) === y(endD)) {
    return `${day(startD)} ${m(startD)} – ${day(endD)} ${m(endD)} ${y(startD)}`;
  }
  return `${day(startD)} ${m(startD)} ${y(startD)} – ${day(endD)} ${m(endD)} ${y(endD)}`;
}

/** Sort key: the reference date used for ordering (end_date preferred, else start_date). */
export function eventSortDate(event: Event): string {
  return event.endDate || event.startDate || event.createdAt || '';
}
