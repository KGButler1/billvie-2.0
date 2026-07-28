import { Event } from '@/types/bill';
import { EventStats } from '@/types/event';
import { Card, CardContent } from '@/components/ui/card';

interface BudgetProgressProps {
  event: Event;
  stats: EventStats;
}

const BudgetProgress = ({ event, stats }: BudgetProgressProps) => {
  return (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total committed</span>
          <span className="text-2xl font-bold">
            ${stats.totalPlanned.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total paid so far</span>
          <span className="font-medium">${stats.totalPaid.toLocaleString()}</span>
        </div>

        {event.budget ? (
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="text-muted-foreground">Amount in mind</span>
            <span className="font-medium">${event.budget.toLocaleString()}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default BudgetProgress;
