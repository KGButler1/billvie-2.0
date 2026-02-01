import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EventStats } from '@/types/event';
import { CheckCircle, XCircle, HelpCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventStatsCardsProps {
  stats: EventStats;
}

const EventStatsCards = ({ stats }: EventStatsCardsProps) => {
  const paymentProgress = stats.totalItems > 0 
    ? (stats.paidItemsCount / stats.totalItems) * 100 
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* Payment Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Payment Status</span>
          </div>
          <p className="text-lg font-bold mb-2">
            {stats.paidItemsCount}/{stats.totalItems} paid
          </p>
          <Progress value={paymentProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Cancellation Summary Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Cancellation</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Cancellable
              </span>
              <span className="font-medium">{stats.cancellableCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-destructive flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Non-refund
              </span>
              <span className="font-medium">{stats.nonRefundableCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> TBD
              </span>
              <span className="font-medium">{stats.tbdCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duration Card (if applicable) */}
      {stats.totalDuration && (
        <Card className="col-span-2">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <span className="text-lg font-bold">
              {stats.totalDuration} {stats.totalDuration === 1 ? 'day' : 'days'}
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventStatsCards;
