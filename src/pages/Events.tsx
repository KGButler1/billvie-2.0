import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { EventService } from '@/services/EventService';
import { Event, EVENT_TYPE_LABELS } from '@/types/bill';
import BottomNav from '@/components/BottomNav';
import CreateEventModal from '@/components/CreateEventModal';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    EventService.initialize();
    loadEvents();
  }, []);

  const loadEvents = () => {
    setEvents(EventService.getAllEvents());
  };

  const handleCreateEvent = (eventData: Omit<Event, 'id' | 'expenses' | 'createdAt' | 'updatedAt'>) => {
    EventService.createEvent(eventData);
    loadEvents();
    setIsCreating(false);
  };

  const handleDeleteEvent = (id: string) => {
    EventService.deleteEvent(id);
    loadEvents();
  };

  const activeEvents = events.filter(e => e.status === 'active' || e.status === 'planning');
  const completedEvents = events.filter(e => e.status === 'completed' || e.status === 'archived');
  const hasSampleEvents = events.some(e => e.isSample);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Events</h1>
          {hasSampleEvents && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                EventService.clearSampleEvents();
                loadEvents();
              }}
              className="text-muted-foreground text-xs"
            >
              Clear samples
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Active Events */}
        {activeEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Active Events</h2>
            <div className="space-y-4">
              {activeEvents.map((event, index) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  index={index}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed Events */}
        {completedEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Completed</h2>
            <div className="space-y-4 opacity-60">
              {completedEvents.map((event, index) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  index={index}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {events.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Plan your first event</h2>
            <p className="text-muted-foreground mb-6">
              Track trips, weddings, moves, and more!
            </p>
            <Button onClick={() => setIsCreating(true)} className="btn-hero">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </motion.div>
        )}
      </main>

      {/* FAB */}
      {events.length > 0 && (
        <motion.button
          onClick={() => setIsCreating(true)}
          className="fab"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {isCreating && (
          <CreateEventModal
            onAdd={handleCreateEvent}
            onClose={() => setIsCreating(false)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

interface EventCardProps {
  event: Event;
  index: number;
  onDelete: (id: string) => void;
}

const EventCard = ({ event, index, onDelete }: EventCardProps) => {
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
      className="card-bill"
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
          onClick={() => onDelete(event.id)}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default Events;
