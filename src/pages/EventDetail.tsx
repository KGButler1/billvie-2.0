import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users } from 'lucide-react';
import { Event } from '@/types/bill';
import { EventService } from '@/services/EventService';
import { EventExpenseService } from '@/services/EventExpenseService';
import { useProfile } from '@/hooks/useProfile';
import BottomNav from '@/components/BottomNav';
import EventHeader from '@/components/events/EventHeader';
import BudgetProgress from '@/components/events/BudgetProgress';
import EventStatsCards from '@/components/events/EventStatsCards';
import CategoryAccordion from '@/components/events/CategoryAccordion';
import AddExpenseModal from '@/components/events/AddExpenseModal';
import EventAnalytics from '@/components/events/EventAnalytics';
import UpgradeModal from '@/components/UpgradeModal';
import { Button } from '@/components/ui/button';

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
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

  const handleEditExpense = (expenseId: string) => {
    setEditingExpenseId(expenseId);
    setIsAddingExpense(true);
  };

  const handleShare = () => {
    navigate('/people');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <EventHeader event={event} onUpdate={loadEvent} />

      <main className="container mx-auto px-4 pt-20">
        <p className="text-sm text-muted-foreground mb-4">
          What's committed for this, and what your household would need to know.
        </p>
        {/* Share Button */}
        <div className="flex justify-end mb-4">
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

        {/* Analytics Pie Chart */}
        {categorySummaries.length > 0 && (
          <EventAnalytics eventId={event.id} />
        )}

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
              <button
                onClick={() => setIsAddingExpense(true)}
                className="text-primary font-medium hover:underline"
              >
                Add Expense
              </button>
            </motion.div>
          )}
        </section>
      </main>

      {/* FAB */}
      <motion.button
        onClick={() => {
          setEditingExpenseId(null);
          setIsAddingExpense(true);
        }}
        className="fab"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

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

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="general"
        onPreviewAnyway={() => setShowUpgradeModal(false)}
      />

      <BottomNav />
    </div>
  );
};

export default EventDetail;
