import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Search, ChevronDown, ChevronRight } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
import { isEventInPast, eventSortDate } from '@/utils/eventDate';

type SortKey = 'date' | 'name' | 'budget';

const SORT_LABELS: Record<SortKey, string> = {
  date: 'Soonest first',
  name: 'Name (A–Z)',
  budget: 'Budget (high to low)',
};

const PAST_COLLAPSED_KEY = 'billvie:events_past_collapsed';

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [sort, setSort] = useState<SortKey>('date');
  const [isLoading, setIsLoading] = useState(() => !EventService.isLoaded());
  const [searchQuery, setSearchQuery] = useState('');
  const [pastCollapsed, setPastCollapsed] = useState(() => {
    try {
      return localStorage.getItem(PAST_COLLAPSED_KEY) !== 'expanded';
    } catch {
      return true;
    }
  });

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

  const hasSampleEvents = events.some(e => e.isSample);
  const eventLimit = isPaid ? EVENT_LIMITS.paid : EVENT_LIMITS.free;
  const currentEventCount = EventService.getEventCount();

  const togglePastCollapsed = () => {
    const next = !pastCollapsed;
    setPastCollapsed(next);
    try {
      localStorage.setItem(PAST_COLLAPSED_KEY, next ? 'collapsed' : 'expanded');
    } catch {
      // ignore
    }
  };

  const { activeEvents, pastEvents } = useMemo(() => {
    const filtered = searchQuery.trim()
      ? events.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      : events;

    const active = filtered.filter(e => !isEventInPast(e));
    const past = filtered.filter(e => isEventInPast(e));

    // Active: dated first (soonest), then undated (newest first)
    active.sort((a, b) => {
      const aDate = eventSortDate(a);
      const bDate = eventSortDate(b);
      const aHasDate = !!(a.startDate || a.endDate);
      const bHasDate = !!(b.startDate || b.endDate);
      if (aHasDate && bHasDate) return aDate.localeCompare(bDate);
      if (aHasDate && !bHasDate) return -1;
      if (!aHasDate && bHasDate) return 1;

      // Both undated — apply sort control
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'budget') return (b.budget ?? 0) - (a.budget ?? 0);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    // If sort is name or budget, re-sort active (overriding the date-first logic)
    if (sort === 'name') {
      active.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'budget') {
      active.sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0));
    }

    // Past: most recent first (by sort date, then created)
    past.sort((a, b) => {
      const aDate = eventSortDate(a);
      const bDate = eventSortDate(b);
      if (aDate && bDate) return bDate.localeCompare(aDate);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return { activeEvents: active, pastEvents: past };
  }, [events, searchQuery, sort]);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pt-16">
      {/* Mobile Header */}
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

        {/* Search + Sort */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
              aria-label="Search events"
            />
          </div>
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

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }}>
              <SkeletonRows rows={4} />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {activeEvents.length > 0 ? (
                <div className="space-y-4">
                  {activeEvents.map((event, index) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      index={index}
                      onDelete={handleDeleteEvent}
                      onClick={() => navigate(`/events/${event.id}`)}
                      onStatusChange={loadEvents}
                    />
                  ))}
                </div>
              ) : pastEvents.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">
                    {events.length === 0
                      ? 'Plan your first event'
                      : searchQuery
                        ? 'No events match your search'
                        : 'Nothing matches this filter'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {events.length === 0
                      ? 'Track trips, weddings, moves, and more!'
                      : 'Try a different search.'}
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
              ) : (
                <p className="text-center py-12 text-muted-foreground text-sm">
                  No active events. All past events are listed below.
                </p>
              )}

              {/* Past events section */}
              {pastEvents.length > 0 && (
                <div className="mt-8">
                  <button
                    onClick={togglePastCollapsed}
                    className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    {pastCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Past events ({pastEvents.length})
                  </button>

                  <AnimatePresence initial={false}>
                    {!pastCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4">
                          {pastEvents.map((event, index) => (
                            <EventCard
                              key={event.id}
                              event={event}
                              index={index}
                              onDelete={handleDeleteEvent}
                              onClick={() => navigate(`/events/${event.id}`)}
                              onStatusChange={loadEvents}
                              showBudgetDetail
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
