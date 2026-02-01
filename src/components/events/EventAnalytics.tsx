import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventExpenseService } from '@/services/EventExpenseService';

interface EventAnalyticsProps {
  eventId: string;
  onCategoryClick?: (category: string) => void;
}

const EventAnalytics = ({ eventId, onCategoryClick }: EventAnalyticsProps) => {
  const data = EventExpenseService.getSpendingByCategory(eventId);

  if (data.length === 0) {
    return null;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                onClick={(entry) => onCategoryClick?.(entry.name)}
                style={{ cursor: 'pointer' }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value, entry: any) => {
                  const item = data.find(d => d.name === value);
                  const percentage = item ? ((item.value / total) * 100).toFixed(0) : 0;
                  return (
                    <span className="text-sm text-foreground">
                      {value} ({percentage}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Total */}
        <div className="text-center pt-2 border-t border-border mt-2">
          <span className="text-muted-foreground text-sm">Total: </span>
          <span className="font-bold text-lg">${total.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventAnalytics;
