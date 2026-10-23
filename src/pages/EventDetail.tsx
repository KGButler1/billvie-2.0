import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, ArrowLeft, CheckCircle2, RotateCcw, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Event, EVENT_TYPE_LABELS, EventStatus } from '@/types/bill';
import { EventService } from '@/services/EventService';
import { EventExpenseService } from '@/services/EventExpenseService';
import { useProfile } from '@/hooks/useProfile';
import BottomNav from '@/components/BottomNav';
import Fab from '@/components/Fab';
import EventHeader from '@/components/events/EventHeader';
import BudgetProgress from '@/components/events/BudgetProgress';
import EventStatsCards from '@/components/events/EventStatsCards';
import CategoryAccordion from '@/components/events/CategoryAccordion';
import AddExpenseModal from '@/components/events/AddExpenseModal';
import EventAnalytics from '@/components/events/EventAnalytics';
import CreateEventModal from '@/components/CreateEventModal';
import UpgradeModal from '@/components/UpgradeModal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ScopeGate from '@/components/ScopeGate';
import EditOnly from '@/components/EditOnly';
import { cn } from '@/lib/utils';
import { isAutoCompleted, formatEventDate } from '@/utils/eventDate';

const statusColors: Record<string, string> = {
  planning: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  active: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  archived: 'bg-muted text-muted-foreground border-muted',
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const { profile } = useProfile();
  const isPaid = profile?.isPaid ?? false;

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = () => {
    if (!id) return;
    const loadedEvent = EventService.getEventById(id);
    if (loadedEvent) {
      setEvent(loadedEvent);
    } else {
      navigate('/events');
    }
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const stats = EventExpenseService.getEventStats(event);
  const categorySummaries = EventExpenseService.getCategorySummaries(event);

  const autoCompleted = isAutoCompleted(event);
  const displayStatus: EventStatus = autoCompleted ? 'completed' : event.status;

  const handleEditExpense = (expenseId: string) => {
    setEditingExpenseId(expenseId);
    setIsAddingExpense(true);
  };

  const handleShare = () => {
    navigate('/people');
  };

  const handleMarkComplete = async () => {
    if (!event) return;
    setStatusUpdating(true);
    try {
      await EventService.updateEvent(event.id, { status: 'completed' });
      loadEvent();
      toast.success('Event marked as complete');
    } catch {
      toast.error('Could not update event status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleReopen = async () => {
    if (!event) return;
    if (autoCompleted) {
      setIsEditingEvent(true);
      return;
    }
    setStatusUpdating(true);
    try {
      await EventService.updateEvent(event.id, { status: 'active' });
      loadEvent();
      toast.success('Event reopened');
    } catch {
      toast.error('Could not update event status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDesktopStatusChange = async (status: EventStatus) => {
    if (!event) return;
    setStatusUpdating(true);
    try {
      await EventService.updateEvent(event.id, { status });
      loadEvent();
    } catch {
      toast.error('Could not update event status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleEditEvent = async (eventData: Omit<Event, 'id' | 'expenses' | 'createdAt' | 'updatedAt'>) => {
    if (!event) return;
    try {
      await EventService.updateEvent(event.id, eventData);
      loadEvent();
      setIsEditingEvent(false);
      toast.success('Event updated');
    } catch {
      toast.error('Could not update event');
    }
  };

  const dateLabel = formatEventDate(event);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pt-16">
      <EventHeader event={event} onUpdate={loadEvent} />

      {/* Desktop back-nav */}
      <div className="hidden lg:flex items-center gap-3 container mx-auto px-4 mb-2">
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <button
          onClick={() => navigate('/events')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </button>
        <span className="text-sm text-muted-foreground">· {EVENT_TYPE_LABELS[event.type]}</span>
        {dateLabel && <span className="text-sm text-muted-foreground">· {dateLabel}</span>}

        {/* Desktop status control */}
        <div className="ml-auto flex items-center gap-2">
          <Select value={displayStatus} onValueChange={handleDesktopStatusChange} disabled={statusUpdating}>
            <SelectTrigger className={cn('w-auto h-8 border text-xs font-medium', statusColors[displayStatus])}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <EditOnly>
            <Button size="sm" variant="outline" onClick={() => setIsEditingEvent(true)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          </EditOnly>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-20 lg:pt-8">
        <ScopeGate scope="events">
        {/* Auto-complete notice */}
        {autoCompleted && (
          <div className="mb-4 rounded-lg bg-muted/50 border border-border p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              The date for this event has passed. Extend the date to reopen it.
            </p>
          </div>
        )}

        {/* Mark Complete / Reopen — visible on both mobile and desktop */}
        <EditOnly>
        <div className="flex items-center gap-2 mb-4">
          {displayStatus === 'completed' || displayStatus === 'archived' ? (
            <Button onClick={handleReopen} disabled={statusUpdating} className="gap-1.5">
              <RotateCcw className="w-4 h-4" />
              Reopen
            </Button>
          ) : (
            <Button onClick={handleMarkComplete} disabled={statusUpdating} className="gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Mark complete
            </Button>
          )}
        </div>
        </EditOnly>

        <p className="text-sm text-muted-foreground mb-4">
          What's committed for this, and what your household would need to know.
        </p>

        {/* Share + Add Expense buttons */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <EditOnly>
          <Button
            onClick={() => {
              setEditingExpenseId(null);
              setIsAddingExpense(true);
            }}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </Button>
          </EditOnly>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
          >
            <Users className="w-4 h-4 mr-2" />
            Who can see this
          </Button>
        </div>

        {/* Budget Progress */}
        <BudgetProgress event={event} stats={stats} />

        {/* Quick Stats Cards */}
        <EventStatsCards stats={stats} />

        {/* Category Breakdown */}
        <section>
          <h2 className="text-lg font-semibold mb-4">What's committed</h2>

          {categorySummaries.length > 0 ? (
            categorySummaries.map(summary => (
              <CategoryAccordion
                key={summary.name}
                summary={summary}
                eventId={event.id}
                onExpenseUpdate={loadEvent}
                onEditExpense={handleEditExpense}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-muted/30 rounded-xl"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Nothing committed yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add what's committed for this — so someone else could pick it up if needed.
              </p>
              <EditOnly>
              <button
                onClick={() => setIsAddingExpense(true)}
                className="text-primary font-medium hover:underline"
              >
                Add Expense
              </button>
              </EditOnly>
            </motion.div>
          )}
        </section>
        </ScopeGate>
      </main>

      {/* FAB */}
      <EditOnly>
      <Fab onClick={() => {
        setEditingExpenseId(null);
        setIsAddingExpense(true);
      }} />
      </EditOnly>

      {/* Add/Edit Expense Modal */}
      <AnimatePresence>
        {isAddingExpense && (
          <AddExpenseModal
            event={event}
            editingExpenseId={editingExpenseId}
            onClose={() => {
              setIsAddingExpense(false);
              setEditingExpenseId(null);
            }}
            onSave={loadEvent}
          />
        )}
      </AnimatePresence>

      {/* Edit Event Modal */}
      <AnimatePresence>
        {isEditingEvent && (
          <CreateEventModal
            initialEvent={event}
            focusDates={autoCompleted}
            onAdd={handleEditEvent}
            onClose={() => setIsEditingEvent(false)}
          />
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="general"
      />

      <BottomNav />
    </div>
  );
};

export default EventDetail;
