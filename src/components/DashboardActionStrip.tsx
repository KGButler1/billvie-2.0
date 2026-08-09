import { TriangleAlert as AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardActionStripProps {
  overdueCount: number;
  dueSoonCount: number;
  upcomingTotal: number;
  isFamilyView: boolean;
  onAttentionClick: () => void;
}

const DashboardActionStrip = ({
  overdueCount,
  dueSoonCount,
  upcomingTotal,
  isFamilyView,
  onAttentionClick,
}: DashboardActionStripProps) => {
  const hasUrgent = overdueCount > 0;

  return (
    <div className="mb-6">
      <button
        onClick={onAttentionClick}
        className={cn(
          'w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left',
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
          <p className="text-2xl font-bold leading-none">
            {overdueCount}
          </p>
          <p className={cn('text-sm mt-1', hasUrgent ? 'text-destructive' : 'text-muted-foreground')}>
            {isFamilyView ? 'Urgent — handle these first' : 'Needs Attention'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {dueSoonCount > 0 && `${dueSoonCount} due soon · `}
            ${upcomingTotal.toLocaleString()} {isFamilyView ? 'to handle' : 'coming up'}
          </p>
        </div>
      </button>
    </div>
  );
};

export default DashboardActionStrip;
