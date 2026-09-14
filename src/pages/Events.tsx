import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EventService } from '@/services/EventService';
import { useProfile } from '@/hooks/useProfile';
import { Event, EVENT_LIMITS } from '@/types/bill';
import BottomNav from '@/components/BottomNav';
import UsageCounter from '@/components/shared/UsageCounter';
import Fab from '@/components/Fab';
import CreateEventModal from '@/components/CreateEventModal';
import UpgradeModal from '@/components/UpgradeModal';
import EventCard from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { SkeletonRows } from '@/components/ui/skeleton';
import ScopeGate from '@/components/ScopeGate';
import EditOnly from '@/components/EditOnly';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'completed';
type SortKey = 'date' | 'name' | 'budget';

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const SORT_LABELS: Record<SortKey, string> = {
  date: 'Newest first',
  name: 'Name (A–Z)',
  budget: 'Budget (high to low)',
};

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('date');
  const [isLoading, setIsLoading] = useState(() => !EventService.isLoaded());

  const { profile } = useProfile();
  const isPaid = profile?.isPaid ?? false;

  useEffect(() => {
    EventService.refresh().then(loadEvents).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const loadEvents = () => {
    setEvents(EventService.getAllEvents());
  };

  const canAddEvent = (): boolean => {
    const currentCount = EventService.getEventCount();
    const limit = isPaid ? EVENT_LIMITS.paid : EVENT_LIMITS.free;
    return currentCount < limit;
  };

  const handleTryCreateEvent = () => {
    if (canAddEvent()) {
      setIsCreating(true);
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handleCreateEvent = async (eventData: Omit<Event, 'id' | 'expenses' | 'createdAt' | 'updatedAt'>) => {
    await EventService.createEvent(eventData);
    loadEvents();
    setIsCreating(false);
  };

  const handleDeleteEvent = async (id: string) => {
    await EventService.deleteEvent(id);
    loadEvents();
  };

  const allEvents = events;
  const activeEvents = events.filter(e => e.status === 'active' || e.status === 'planning');
  const completedEvents = events.filter(e => e.status === 'completed' || e.status === 'archived');
  const hasSampleEvents = events.some(e => e.isSample);
  const eventLimit = isPaid ? EVENT_LIMITS.paid : EVENT_LIMITS.free;
  const currentEventCount = EventService.getEventCount();

  const counts = useMemo(() => ({
    all: allEvents.length,
    active: activeEvents.length,
    completed: completedEvents.length,
  }), [allEvents, activeEvents, completedEvents]);

  const visibleEvents = useMemo(() => {
    let list = allEvents;
    if (statusFilter === 'active') list = activeEvents;
    else if (statusFilter === 'completed') list = completedEvents;

    const sorted = [...list];
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'budget') {
      sorted.sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0));
    } else {
      sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return sorted;
  }, [allEvents, activeEvents, completedEvents, statusFilter, sort]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Events</h1>
          </div>
          <div className="flex items-center gap-2">
            {hasSampleEvents && (
              <EditOnly>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await EventService.clearSampleEvents();
                  loadEvents();
                }}
                className="text-muted-foreground text-xs"
              >
                Clear samples
              </Button>
              </EditOnly>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 lg:pt-8">
        <ScopeGate scope="events">
        <h1 className="text-2xl font-semibold hidden lg:block mb-2">Events</h1>
        <UsageCounter count={currentEventCount} limit={eventLimit} label="events" />
        <p className="text-sm text-muted-foreground mb-6">
          Track big one-off commitments — trips, weddings, renovations — so your household knows
          what's planned, what's paid, and what can still change.
        </p>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_CHIPS.map(chip => (
              <button
                key={chip.key}
                onClick={() => setStatusFilter(chip.key)}
                className={cn(
                  'text-sm px-3 py-1.5 rounded-full border transition-colors',
                  statusFilter === chip.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                {chip.label} ({counts[chip.key]})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <EditOnly>
            <Button onClick={handleTryCreateEvent} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
            </EditOnly>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }}>
              <SkeletonRows rows={4} />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {visibleEvents.length > 0 ? (
                <div className="space-y-4">
                  {visibleEvents.map((event, index) => (
                    <div key={event.id} className={cn(event.status === 'completed' || event.status === 'archived' ? 'opacity-60' : '')}>
                      <EventCard
                        event={event}
                        index={index}
                        onDelete={handleDeleteEvent}
                        onClick={() => navigate(`/events/${event.id}`)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">
                    {events.length === 0 ? 'Plan your first event' : 'Nothing matches this filter'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {events.length === 0
                      ? 'Track trips, weddings, moves, and more!'
                      : 'Try a different status filter.'}
                  </p>
                  {events.length === 0 && (
                    <EditOnly>
                    <Button onClick={handleTryCreateEvent} className="btn-hero">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event
                    </Button>
                    </EditOnly>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </ScopeGate>
      </main>

      {/* FAB */}
      {events.length > 0 && (
        <EditOnly>
        <Fab onClick={handleTryCreateEvent} />
        </EditOnly>
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

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="events"
      />

      <BottomNav />
    </div>
  );
};

export default Events;
