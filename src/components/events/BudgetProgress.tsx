import { Event } from '@/types/bill';
import { EventStats } from '@/types/event';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface BudgetProgressProps {
  event: Event;
  stats: EventStats;
}

const BudgetProgress = ({ event, stats }: BudgetProgressProps) => {
  if (!event.budget) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Planned</span>
            <span className="text-xl font-bold">
              ${stats.totalPlanned.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const percentage = Math.min(stats.budgetPercentage, 100);
  const isNearBudget = stats.budgetPercentage >= 90 && !stats.isOverBudget;
  
  return (
    <Card className={cn(
      'mb-4 transition-colors',
      stats.isOverBudget && 'border-destructive/50',
      isNearBudget && !stats.isOverBudget && 'border-yellow-500/50'
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Main Amount Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'text-2xl font-bold',
              stats.isOverBudget && 'text-destructive'
            )}>
              ${stats.totalPlanned.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              / ${event.budget.toLocaleString()} budget
            </span>
          </div>
          
          {stats.isOverBudget ? (
            <div className="flex items-center gap-1 text-destructive">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">
                Over by ${Math.abs(stats.budgetRemaining || 0).toLocaleString()}
              </span>
            </div>
          ) : isNearBudget ? (
            <div className="flex items-center gap-1 text-yellow-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {stats.budgetPercentage.toFixed(0)}% used
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-green-500">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-medium">
                ${stats.budgetRemaining?.toLocaleString()} left
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <Progress 
          value={percentage} 
          className={cn(
            'h-3',
            stats.isOverBudget && '[&>div]:bg-destructive',
            isNearBudget && !stats.isOverBudget && '[&>div]:bg-yellow-500'
          )}
        />

        {/* Paid vs Unpaid */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Paid: <span className="text-foreground font-medium">${stats.totalPaid.toLocaleString()}</span>
          </span>
          <span className="text-muted-foreground">
            Unpaid: <span className="text-foreground font-medium">${stats.totalUnpaid.toLocaleString()}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetProgress;
