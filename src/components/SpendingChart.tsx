import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { BillCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/bill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingChartProps {
  spending: Record<BillCategory, number>;
}

const SpendingChart = ({ spending }: SpendingChartProps) => {
  const data = useMemo(() => {
    return Object.entries(spending)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({
        category: CATEGORY_LABELS[category as BillCategory],
        amount,
        color: CATEGORY_COLORS[category as BillCategory],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [spending]);

  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="category" 
                width={90}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpendingChart;
