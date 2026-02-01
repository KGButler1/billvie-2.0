import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Event, EVENT_TYPE_LABELS } from '@/types/bill';
import { EventService } from '@/services/EventService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  index: number;
  onDelete: (id: string) => void;
  onClick: () => void;
}

const EventCard = ({ event, index, onDelete, onClick }: EventCardProps) => {
  const totalSpent = EventService.getTotalSpent(event);
  const totalPlanned = EventService.getTotalPlanned(event);
  const progress = event.budget ? (totalSpent / event.budget) * 100 : 0;
  const isOverBudget = event.budget && totalSpent > event.budget;
  
  const daysUntil = event.startDate 
    ? differenceInDays(parseISO(event.startDate), new Date())
    : null;

  const statusColors = {
    planning: 'bg-blue-500/10 text-blue-500',
    active: 'bg-green-500/10 text-green-500',
    completed: 'bg-muted text-muted-foreground',
    archived: 'bg-muted text-muted-foreground',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card-bill cursor-pointer hover:border-primary/50 transition-colors"
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
            {daysUntil !== null && daysUntil > 0 && (
              <span className="text-primary font-medium">• {daysUntil} days away</span>
            )}
          </div>
        </div>
        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusColors[event.status])}>
          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
        </span>
      </div>

      {/* Budget Progress */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Spent: <span className={cn('font-medium', isOverBudget ? 'text-destructive' : 'text-foreground')}>
              ${totalSpent.toLocaleString()}
            </span>
          </span>
          {event.budget && (
            <span className="text-muted-foreground">
              Budget: <span className="font-medium text-foreground">${event.budget.toLocaleString()}</span>
            </span>
          )}
        </div>
        {event.budget && (
          <Progress 
            value={Math.min(progress, 100)} 
            className={cn('h-2', isOverBudget && '[&>div]:bg-destructive')}
          />
        )}
      </div>

      {/* Expenses count */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-sm text-muted-foreground">
          {event.expenses.length} expense{event.expenses.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(event.id);
          }}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default EventCard;
