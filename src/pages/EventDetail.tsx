import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Share2, Lock } from 'lucide-react';
import { Event } from '@/types/bill';
import { EventService } from '@/services/EventService';
import { EventExpenseService } from '@/services/EventExpenseService';
import { UserService } from '@/services/UserService';
import BottomNav from '@/components/BottomNav';
import EventHeader from '@/components/events/EventHeader';
import BudgetProgress from '@/components/events/BudgetProgress';
import EventStatsCards from '@/components/events/EventStatsCards';
import CategoryAccordion from '@/components/events/CategoryAccordion';
import AddExpenseModal from '@/components/events/AddExpenseModal';
import EventAnalytics from '@/components/events/EventAnalytics';
import ShareModal from '@/components/sharing/ShareModal';
import UpgradeModal from '@/components/UpgradeModal';
import { Button } from '@/components/ui/button';

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const settings = UserService.getSettings();
  const isPaid = settings.userType === 'paid' || settings.userType === 'accountant';

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
  
  // Filter categories if a category filter is set
  const filteredSummaries = categoryFilter
    ? categorySummaries.filter(s => s.name === categoryFilter)
    : categorySummaries;

  const handleCategoryClick = (category: string) => {
    setCategoryFilter(prev => prev === category ? null : category);
  };

  const handleEditExpense = (expenseId: string) => {
    setEditingExpenseId(expenseId);
    setIsAddingExpense(true);
  };

  const handleUpgrade = () => {
    UserService.saveSettings({ userType: 'paid', hasEventsAccess: true });
    setShowUpgradeModal(false);
    setShowShareModal(true);
  };

  const handleShare = () => {
    if (isPaid) {
      setShowShareModal(true);
    } else {
      setShowUpgradeModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <EventHeader event={event} onUpdate={loadEvent} />

      <main className="container mx-auto px-4 pt-20">
        {/* Share Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
          >
            {isPaid ? (
              <Share2 className="w-4 h-4 mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Share Event
          </Button>
        </div>
        {/* Budget Progress */}
        <BudgetProgress event={event} stats={stats} />

        {/* Quick Stats Cards */}
        <EventStatsCards stats={stats} />

        {/* Analytics Pie Chart */}
        {categorySummaries.length > 0 && (
          <EventAnalytics 
            eventId={event.id} 
            onCategoryClick={handleCategoryClick}
          />
        )}

        {/* Category Filter Indicator */}
        {categoryFilter && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            <button
              onClick={() => setCategoryFilter(null)}
              className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium hover:bg-primary/20"
            >
              {categoryFilter} ×
            </button>
          </div>
        )}

        {/* Category Breakdown */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Expenses by Category</h2>
          
          {filteredSummaries.length > 0 ? (
            filteredSummaries.map(summary => (
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
              <h3 className="font-semibold mb-1">No expenses yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Start tracking by adding your first expense
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

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            type="event"
            resourceId={event.id}
            resourceName={event.name}
            onRequireUpgrade={() => setShowUpgradeModal(true)}
          />
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="general"
        onUpgrade={handleUpgrade}
        onPreviewAnyway={() => { setShowUpgradeModal(false); setShowShareModal(true); }}
      />

      <BottomNav />
    </div>
  );
};

export default EventDetail;
