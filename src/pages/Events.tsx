import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, ChartBar as BarChart3, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EventService } from '@/services/EventService';
import { useProfile } from '@/hooks/useProfile';
import { Event, EVENT_LIMITS } from '@/types/bill';
import BottomNav from '@/components/BottomNav';
import CreateEventModal from '@/components/CreateEventModal';
import UpgradeModal from '@/components/UpgradeModal';
import EventCard from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { SkeletonRows } from '@/components/ui/skeleton';

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'events' | 'general'>('events');
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
      setUpgradeReason('events');
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

  const handleCompare = () => {
    if (!isPaid) {
      setUpgradeReason('general');
      setShowUpgradeModal(true);
      return;
    }
    navigate('/events/compare');
  };

  const activeEvents = events.filter(e => e.status === 'active' || e.status === 'planning');
  const completedEvents = events.filter(e => e.status === 'completed' || e.status === 'archived');
  const hasSampleEvents = events.some(e => e.isSample);
  const eventLimit = isPaid ? EVENT_LIMITS.paid : EVENT_LIMITS.free;
  const currentEventCount = EventService.getEventCount();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Events</h1>
            {eventLimit !== Infinity && (
              <p className="text-xs text-muted-foreground">
                {currentEventCount} / {eventLimit} events used
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasSampleEvents && (
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
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        <p className="text-sm text-muted-foreground mb-6">
          Track big one-off commitments — trips, weddings, renovations — so your household knows
          what's planned, what's paid, and what can still change.
        </p>
        {/* Advanced Features Bar */}
        {events.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompare}
              className="whitespace-nowrap"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Compare Events
              {!isPaid && <Lock className="w-3 h-3 ml-2 text-muted-foreground" />}
            </Button>
          </div>
        )}

        {/* Active Events */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }}>
              <SkeletonRows rows={4} />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                        onClick={() => navigate(`/events/${event.id}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed Events */}
              {completedEvents.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-muted-foreground">Completed</h2>
                  </div>
                  <div className="space-y-4 opacity-60">
                    {completedEvents.map((event, index) => (
                      <div key={event.id} className="relative">
                        <EventCard 
                          event={event} 
                          index={index}
                          onDelete={handleDeleteEvent}
                          onClick={() => navigate(`/events/${event.id}`)}
                        />
                      </div>
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
                  <Button onClick={handleTryCreateEvent} className="btn-hero">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FAB */}
      {events.length > 0 && (
        <motion.button
          onClick={handleTryCreateEvent}
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


      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
      />

      <BottomNav />
    </div>
  );
};

export default Events;
