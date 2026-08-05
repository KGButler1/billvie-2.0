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

  // When there's no real spending data, show all built-in categories as
  // low-opacity placeholder rows so the card doesn't disappear.
  const placeholderData = useMemo(() => {
    return (Object.keys(CATEGORY_LABELS) as BillCategory[]).map((category) => ({
      category: CATEGORY_LABELS[category],
      amount: 0,
      color: CATEGORY_COLORS[category],
    }));
  }, []);

  const chartData = data.length > 0 ? data : placeholderData;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Household Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" hide domain={[0, 'auto']} />
              <YAxis
                type="category"
                dataKey="category"
                width={90}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}`, 'Amount']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} opacity={data.length === 0 ? 0.25 : 1}>
                {chartData.map((entry, index) => (
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
