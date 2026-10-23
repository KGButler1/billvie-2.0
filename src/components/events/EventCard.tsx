import { motion } from 'framer-motion';
import { Trash2, CheckCircle2, RotateCcw, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Event, EVENT_TYPE_LABELS } from '@/types/bill';
import { EventService } from '@/services/EventService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import EditOnly from '@/components/EditOnly';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isAutoCompleted, isEventInPast, formatEventDate, effectiveStatus } from '@/utils/eventDate';
import { formatCurrency } from '@/utils/currency';

interface EventCardProps {
  event: Event;
  index: number;
  onDelete: (id: string) => void;
  onClick: () => void;
  onStatusChange?: () => void;
  showBudgetDetail?: boolean;
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-500/10 text-blue-500',
  active: 'bg-green-500/10 text-green-500',
  completed: 'bg-green-500/10 text-green-500',
  archived: 'bg-muted text-muted-foreground',
};

const EventCard = ({ event, index, onDelete, onClick, onStatusChange, showBudgetDetail }: EventCardProps) => {
  const totalSpent = EventService.getTotalSpent(event);
  const totalPlanned = EventService.getTotalPlanned(event);
  const progress = event.budget ? (totalSpent / event.budget) * 100 : 0;
  const isOverBudget = event.budget && totalSpent > event.budget;

  const autoCompleted = isAutoCompleted(event);
  const past = isEventInPast(event);
  const effStatus = effectiveStatus(event);
  const dateLabel = formatEventDate(event);

  const handleMarkComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await EventService.updateEvent(event.id, { status: 'completed' });
      toast.success('Event marked as complete');
      onStatusChange?.();
    } catch {
      toast.error('Could not update event status');
    }
  };

  const handleReopen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await EventService.updateEvent(event.id, { status: 'active' });
      toast.success('Event reopened');
      onStatusChange?.();
    } catch {
      toast.error('Could not update event status');
    }
  };

  const budgetDiff = event.budget != null
    ? totalSpent - event.budget
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'card-bill cursor-pointer hover:border-primary/50 transition-colors relative',
        past && 'opacity-60'
      )}
      onClick={onClick}
    >
      {/* Sample indicator */}
      {event.isSample && (
        <span className="absolute top-2 right-2 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
          Sample
        </span>
      )}

      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{EVENT_TYPE_LABELS[event.type]}</span>
            {dateLabel && <span>• {dateLabel}</span>}
            {autoCompleted && (
              <span className="text-xs text-muted-foreground">• Date has passed</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full capitalize', statusColors[effStatus])}>
            {effStatus === 'completed' ? 'Completed' : effStatus}
          </span>
          <EditOnly>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {effStatus === 'completed' || effStatus === 'archived' ? (
                <DropdownMenuItem onClick={handleReopen}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reopen
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleMarkComplete}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark complete
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </EditOnly>
        </div>
      </div>

      {/* Budget detail for past events, summary for active */}
      {showBudgetDetail && past ? (
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Total spent: <span className="font-medium text-foreground">{formatCurrency(totalSpent)}</span>
            </span>
            {event.budget != null && (
              <span className="text-muted-foreground">
                In mind: <span className="font-medium text-foreground">{formatCurrency(event.budget)}</span>
              </span>
            )}
          </div>
          {budgetDiff != null && budgetDiff !== 0 && event.budget != null && (
            <p className={cn('text-xs', budgetDiff > 0 ? 'text-destructive' : 'text-muted-foreground')}>
              {formatCurrency(Math.abs(budgetDiff))} {budgetDiff > 0 ? 'over' : 'under'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Total committed: <span className="font-medium text-foreground">
                {formatCurrency(totalPlanned)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Paid so far: <span className={cn('font-medium', totalSpent > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                {formatCurrency(totalSpent)}
              </span>
            </span>
          </div>
          {event.budget && (
            <>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Budget: {formatCurrency(event.budget)}</span>
                {isOverBudget && <span className="text-destructive font-medium">Over budget</span>}
              </div>
              <Progress
                value={Math.min(progress, 100)}
                className={cn('h-2', isOverBudget && '[&>div]:bg-destructive')}
              />
            </>
          )}
        </div>
      )}

      {/* Expenses count */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-sm text-muted-foreground">
          {event.expenses.length} expense{event.expenses.length !== 1 ? 's' : ''}
        </span>
      </div>
    </motion.div>
  );
};

export default EventCard;
