import { Link } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Event, EVENT_TYPE_LABELS } from '@/types/bill';
import { EventService } from '@/services/EventService';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ActiveEventsWidgetProps {
  events: Event[];
}

const ActiveEventsWidget = ({ events }: ActiveEventsWidgetProps) => {
  if (events.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Upcoming Life Events
        </CardTitle>
        <Link to="/events" className="text-sm text-primary flex items-center gap-1 hover:underline">
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.slice(0, 3).map(event => {
          const totalSpent = EventService.getTotalSpent(event);
          const progress = event.budget ? (totalSpent / event.budget) * 100 : 0;
          const isOverBudget = event.budget && totalSpent > event.budget;

          return (
            <div key={event.id} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm truncate">{event.name}</span>
                <span className="text-xs text-muted-foreground">{EVENT_TYPE_LABELS[event.type]}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className={cn(isOverBudget && 'text-destructive')}>
                  ${totalSpent.toLocaleString()} spent
                </span>
                {event.budget && <span>of ${event.budget.toLocaleString()}</span>}
              </div>
              {event.budget && (
                <Progress 
                  value={Math.min(progress, 100)} 
                  className={cn('h-1.5', isOverBudget && '[&>div]:bg-destructive')}
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ActiveEventsWidget;
