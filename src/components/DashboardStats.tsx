import { Wallet, TriangleAlert as AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  upcomingTotal: number;
  dueSoonCount: number;
  overdueCount: number;
  isFamilyView?: boolean;
}

const DashboardStats = ({ upcomingTotal, dueSoonCount, overdueCount, isFamilyView = false }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <Card className="bg-card">
        <CardContent className="p-4 text-center">
          <Wallet className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold text-foreground">
            ${upcomingTotal.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">{isFamilyView ? 'To handle' : 'Coming Up'}</p>
        </CardContent>
      </Card>

      <Card className={cn('bg-card', dueSoonCount > 0 && 'border-yellow-500/50')}>
        <CardContent className="p-4 text-center">
          <Calendar className={cn('w-5 h-5 mx-auto mb-1', dueSoonCount > 0 ? 'text-yellow-500' : 'text-muted-foreground')} />
          <p className={cn('text-lg font-bold', dueSoonCount > 0 ? 'text-yellow-500' : 'text-foreground')}>
            {dueSoonCount}
          </p>
          <p className="text-xs text-muted-foreground">Due Soon</p>
        </CardContent>
      </Card>

      <Card className={cn('bg-card', overdueCount > 0 && 'border-destructive/50')}>
        <CardContent className="p-4 text-center">
          <AlertTriangle className={cn('w-5 h-5 mx-auto mb-1', overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground')} />
          <p className={cn('text-lg font-bold', overdueCount > 0 ? 'text-destructive' : 'text-foreground')}>
            {overdueCount}
          </p>
          <p className="text-xs text-muted-foreground">{isFamilyView ? 'Urgent' : 'Needs Attention'}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
