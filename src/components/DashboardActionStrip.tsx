import { TriangleAlert as AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardActionStripProps {
  overdueCount: number;
  comingUpTotal: number;
  comingUpWindowDays: number;
  outstandingTotal: number;
  onAttentionClick: () => void;
}

const DashboardActionStrip = ({
  overdueCount,
  comingUpTotal,
  comingUpWindowDays,
  outstandingTotal,
  onAttentionClick,
}: DashboardActionStripProps) => {
  const hasUrgent = overdueCount > 0;

  return (
    <button
      onClick={onAttentionClick}
      className={cn(
        'w-full h-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left',
        hasUrgent
          ? 'bg-destructive/5 border border-destructive/20 hover:bg-destructive/10'
          : 'bg-card border border-border hover:bg-muted/50'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
          hasUrgent ? 'bg-destructive/10' : 'bg-muted'
        )}
      >
        <AlertTriangle className={cn('w-6 h-6', hasUrgent ? 'text-destructive' : 'text-muted-foreground')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Needs Attention
        </p>
        <p className={cn('text-2xl font-bold leading-none', hasUrgent && 'text-destructive')}>
          {overdueCount}
        </p>
        <p className="text-sm font-medium mt-2">
          ${comingUpTotal.toLocaleString()} coming up in {comingUpWindowDays} days
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          ${outstandingTotal.toLocaleString()} total outstanding
        </p>
      </div>
    </button>
  );
};

export default DashboardActionStrip;
