import { formatDistanceToNow, parseISO } from 'date-fns';

interface ChangeHistoryLineProps {
  createdAt: string;
  updatedAt?: string;
  /**
   * Hook for real attribution ("Updated yesterday by Sam"). Always left undefined
   * today — there's no auth distinguishing who's acting on a shared device, so
   * showing a name would be a guess. Wire this up when accounts exist.
   */
  attributedTo?: string;
  className?: string;
}

const relative = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return undefined;
  }
};

const ChangeHistoryLine = ({
  createdAt,
  updatedAt,
  attributedTo,
  className,
}: ChangeHistoryLineProps) => {
  const added = relative(createdAt);
  const changed = updatedAt && updatedAt !== createdAt ? relative(updatedAt) : undefined;

  const parts: string[] = [];
  if (added) parts.push(`Added ${added}`);
  if (changed) parts.push(`updated ${changed}${attributedTo ? ` by ${attributedTo}` : ''}`);

  if (!parts.length) return null;

  return (
    <p className={className ?? 'text-xs text-muted-foreground'}>{parts.join(' · ')}</p>
  );
};

export default ChangeHistoryLine;
