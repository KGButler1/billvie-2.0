import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Event, EVENT_TYPE_LABELS } from '@/types/bill';
import { EventService } from '@/services/EventService';
import { EventExpenseService } from '@/services/EventExpenseService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const EventComparison = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    const allEvents = EventService.getAllEvents();
    setEvents(allEvents.filter(e => e.expenses.length > 0));
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectedEvents = events.filter(e => selectedIds.includes(e.id));

  const handleCompare = () => {
    if (selectedEvents.length >= 2) {
      setIsComparing(true);
    }
  };

  if (isComparing) {
    return (
      <ComparisonView 
        events={selectedEvents}
        onBack={() => setIsComparing(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/events')} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Compare Events</h1>
          <Button 
            onClick={handleCompare}
            disabled={selectedEvents.length < 2}
            size="sm"
          >
            Compare ({selectedEvents.length})
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        <p className="text-sm text-muted-foreground mb-4">
          Select 2 or more events to compare side-by-side.
        </p>

        <div className="space-y-3">
          {events.map((event, index) => {
            const isSelected = selectedIds.includes(event.id);
            const stats = EventExpenseService.getEventStats(event);
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => toggleSelection(event.id)}
                className={cn(
                  'bg-card rounded-xl border p-4 cursor-pointer transition-colors',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(event.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{event.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{EVENT_TYPE_LABELS[event.type]}</span>
                      <span>•</span>
                      <span>{event.expenses.length} expenses</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">
                        ${stats.totalPlanned.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No events to compare</h3>
            <p className="text-sm text-muted-foreground">
              Add expenses to your events first.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

// Comparison View
interface ComparisonViewProps {
  events: Event[];
  onBack: () => void;
}

const ComparisonView = ({ events, onBack }: ComparisonViewProps) => {
  const stats = events.map(event => ({
    event,
    stats: EventExpenseService.getEventStats(event),
    categories: EventExpenseService.getCategorySummaries(event),
  }));

  // Get all unique categories
  const allCategories = [...new Set(stats.flatMap(s => s.categories.map(c => c.name)))];

  // Prepare chart data
  const chartData = allCategories.map(category => {
    const data: Record<string, string | number> = { category };
    stats.forEach(({ event, categories }) => {
      const cat = categories.find(c => c.name === category);
      data[event.name] = cat?.totalAmount || 0;
    });
    return data;
  });

  // Colors for events
  const colors = ['hsl(var(--primary))', 'hsl(280, 60%, 55%)', 'hsl(145, 60%, 42%)', 'hsl(38, 90%, 50%)'];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Comparison Results</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map(({ event, stats: s }, index) => (
            <div 
              key={event.id}
              className="bg-card rounded-xl border border-border p-4"
              style={{ borderLeftColor: colors[index % colors.length], borderLeftWidth: 3 }}
            >
              <h3 className="font-medium text-sm truncate mb-2">{event.name}</h3>
              <p className="text-2xl font-bold">${s.totalPlanned.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {event.expenses.length} expenses
              </p>
            </div>
          ))}
        </div>

        {/* Category Comparison Chart */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <h3 className="font-medium mb-4">Spending by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  width={80} 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {events.map((event, index) => (
                  <Bar 
                    key={event.id}
                    dataKey={event.name}
                    fill={colors[index % colors.length]}
                    radius={[0, 4, 4, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-medium mb-3">Insights</h3>
          <div className="space-y-2 text-sm">
            {stats.length >= 2 && (
              <>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{stats[0].event.name}</span>
                  {' '}cost{' '}
                  <span className={cn(
                    'font-medium',
                    stats[0].stats.totalPlanned > stats[1].stats.totalPlanned ? 'text-destructive' : 'text-green-600'
                  )}>
                    {Math.abs(Math.round(((stats[0].stats.totalPlanned - stats[1].stats.totalPlanned) / stats[1].stats.totalPlanned) * 100))}%
                    {stats[0].stats.totalPlanned > stats[1].stats.totalPlanned ? ' more' : ' less'}
                  </span>
                  {' '}than{' '}
                  <span className="font-medium text-foreground">{stats[1].event.name}</span>
                </p>
                
                {/* Find biggest category difference */}
                {allCategories.map(category => {
                  const vals = stats.map(s => s.categories.find(c => c.name === category)?.totalAmount || 0);
                  const diff = Math.max(...vals) - Math.min(...vals);
                  if (diff > 500) {
                    return (
                      <p key={category} className="text-muted-foreground">
                        Biggest difference in <span className="font-medium text-foreground">{category}</span>: 
                        ${diff.toLocaleString()} variance
                      </p>
                    );
                  }
                  return null;
                })}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventComparison;
