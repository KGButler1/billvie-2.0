import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Scan, Shield } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { EventService } from '@/services/EventService';
import { UserService } from '@/services/UserService';
import { Bill } from '@/types/bill';
import { canAddBill } from '@/utils/billLimits';
import BillList from '@/components/bills/BillList';
import QuickAddBill from '@/components/QuickAddBill';
import BillDetailDialog from '@/components/bills/BillDetailDialog';
import BillScanModal from '@/components/BillScanModal';
import BottomNav from '@/components/BottomNav';
import DevPanel from '@/components/DevPanel';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardStats from '@/components/DashboardStats';
import SpendingChart from '@/components/SpendingChart';
import ActiveEventsWidget from '@/components/ActiveEventsWidget';
import UpgradeModal from '@/components/UpgradeModal';
import ProgressiveHints from '@/components/ProgressiveHints';
import FirstWeekNudges from '@/components/FirstWeekNudges';
import DocumentsWidget from '@/components/DocumentsWidget';
import AdvisorWidget from '@/components/AdvisorWidget';
import FinancialSnapshotWidget from '@/components/FinancialSnapshotWidget';
import TaxWidget from '@/components/TaxWidget';
import HouseholdSetupWidget from '@/components/HouseholdSetupWidget';

const Dashboard = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchParams] = useSearchParams();
  const [isAddingBill, setIsAddingBill] = useState(() => searchParams.get('add') === 'bill');
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isScanningBill, setIsScanningBill] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);
  
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isFamilyView, setIsFamilyView] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    UserService.initializeTheme();
    BillService.initialize();
    EventService.initialize();
    loadBills();

    // Dev panel keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDevPanel(prev => !prev);
      }
    };

    // Check URL param for dev mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
      setShowDevPanel(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadBills = () => {
    const allBills = BillService.getUpcomingBills();
    const paidBills = BillService.getAllBills().filter(b => b.status === 'paid');
    setBills([...allBills, ...paidBills]);
  };


  const handleTryAddBill = () => {
    if (canAddBill()) {
      setIsAddingBill(true);
    } else {
      setShowUpgradeModal(true);
    }
    setShowFabMenu(false);
  };

  const handleTryScanBill = () => {
    if (canAddBill()) {
      setIsScanningBill(true);
    } else {
      setShowUpgradeModal(true);
    }
    setShowFabMenu(false);
  };

  const handleAddBill = (
    billData: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
    linkedDocumentId?: string
  ) => {
    const created = BillService.addBill(billData);
    if (linkedDocumentId) DocumentLinkService.linkToBill(linkedDocumentId, created.id);
    loadBills();
    setIsAddingBill(false);
    setIsScanningBill(false);
  };

  const handleUpgrade = () => {
    UserService.saveSettings({ userType: 'paid', hasEventsAccess: true });
    setShowUpgradeModal(false);
  };

  const handleUpdateBill = (updates: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    if (!editingBill) return;
    BillService.updateBill(editingBill.id, updates);
    loadBills();
    setEditingBill(null);
    setDetailBill(null);
  };

  const handleMarkPaid = (id: string) => {
    BillService.markAsPaid(id);
    loadBills();
  };

  const handleMarkUnpaid = (id: string) => {
    BillService.markAsUnpaid(id);
    loadBills();
  };

  const handleDeleteBill = (id: string) => {
    if (!confirm('Delete this bill? You can restore it from Recently Deleted within 30 days.')) return;
    BillService.deleteBill(id);
    loadBills();
  };

  // Section title helpers based on Family View
  const getSectionTitle = (section: 'overdue' | 'due_soon' | 'upcoming' | 'paid') => {
    if (isFamilyView) {
      const familyLabels = {
        overdue: 'Urgent — handle these first',
        due_soon: 'Due soon — don\'t miss these',
        upcoming: 'What needs to be handled',
        paid: 'Already taken care of',
      };
      return familyLabels[section];
    }
    const defaultLabels = {
      overdue: 'Needs Attention',
      due_soon: 'Due Soon',
      upcoming: 'Coming Up',
      paid: 'Handled',
    };
    return defaultLabels[section];
  };

  // Dashboard stats - calculate these first so they're available below
  const upcomingTotal = BillService.getUpcomingTotal();
  const spending = BillService.getSpendingByCategory();
  const activeEvents = EventService.getActiveEvents();

  const overdueBills = bills.filter(b => b.status === 'overdue');
  const dueSoonBills = bills.filter(b => b.status === 'due_soon');

  const hasSampleBills = bills.some(b => b.isSample);

  // Jan-Apr: tax records matter more, so lift that widget up the stack
  const isTaxSeason = new Date().getMonth() <= 3;

  return (
    <div className="min-h-screen bg-background pb-24">
      <DashboardHeader 
        onClearSamples={() => {
          BillService.clearSampleBills();
          loadBills();
        }}
        hasSampleBills={hasSampleBills}
        isFamilyView={isFamilyView}
        onToggleFamilyView={() => setIsFamilyView(!isFamilyView)}
      />

      <main className="container mx-auto px-4 pt-20">
        {/* Desktop-only toolbar for dashboard-specific controls */}
        <div className="hidden lg:flex items-center justify-end gap-2 mb-4">
          {hasSampleBills && (
            <button
              onClick={() => {
                BillService.clearSampleBills();
                loadBills();
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear samples
            </button>
          )}
          <button
            onClick={() => setIsFamilyView(!isFamilyView)}
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              isFamilyView
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            {isFamilyView ? 'Exit Family View' : 'Family View'}
          </button>
        </div>

        {/* Family View Banner */}
        {isFamilyView && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2"
          >
            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground">
              <strong>Family View</strong> — Here's what needs to be handled if you're stepping in
            </p>
          </motion.div>
        )}

        {/* Dashboard Stats */}
        <DashboardStats 
          upcomingTotal={upcomingTotal}
          dueSoonCount={dueSoonBills.length}
          overdueCount={overdueBills.length}
          isFamilyView={isFamilyView}
        />

        {/* Trust signal */}
        <p className="text-xs text-muted-foreground text-center mb-4 flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3" />
          Only you and people you invite can see this
        </p>

        {/* Household setup */}
        <HouseholdSetupWidget />

        {/* Spending Chart */}
        <SpendingChart spending={spending} />

        {/* Active Events Widget */}
        <ActiveEventsWidget events={activeEvents} />



        {/* Tax season (Jan-Apr) surfaces tax records earlier in the stack */}
        {isTaxSeason && <TaxWidget />}

        {/* Important Documents Widget */}
        <DocumentsWidget />

        {/* Financial Snapshot Widget */}
        <FinancialSnapshotWidget />

        {!isTaxSeason && <TaxWidget />}

        {/* Advisor Widget */}
        <AdvisorWidget />

        {/* Bills needing attention */}
        <BillList
          bills={[...overdueBills, ...dueSoonBills]}
          mode="grouped"
          sectionTitle={getSectionTitle}
          onMarkPaid={handleMarkPaid}
          onMarkUnpaid={handleMarkUnpaid}
          onDelete={handleDeleteBill}
          onEdit={setEditingBill}
          onOpen={setDetailBill}
        />

        {bills.length > 0 && (
          <Link
            to="/bills"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-8"
          >
            View all {bills.length} bills →
          </Link>
        )}

        {/* Empty State */}
        {bills.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <button
              onClick={handleTryAddBill}
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <Plus className="w-8 h-8 text-primary" />
            </button>
            <h2 className="text-xl font-semibold mb-2">Nothing tracked yet</h2>
            <p className="text-muted-foreground mb-6">
              Add your first household bill or commitment — so your family always knows what's running
            </p>
          </motion.div>
        )}
      </main>

      {/* FAB with menu */}
      <div className="fixed bottom-24 right-6 z-50">
        <AnimatePresence>
          {showFabMenu && (
            <>
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                onClick={handleTryScanBill}
                className="absolute bottom-16 right-0 w-12 h-12 rounded-full bg-secondary flex items-center justify-center shadow-lg"
              >
                <Scan className="w-5 h-5" />
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.05 } }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                onClick={handleTryAddBill}
                className="absolute bottom-32 right-0 w-12 h-12 rounded-full bg-secondary flex items-center justify-center shadow-lg"
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            </>
          )}
        </AnimatePresence>
        
        <motion.button
          onClick={() => setShowFabMenu(!showFabMenu)}
          className="fab relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: showFabMenu ? 45 : 0 }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Bill detail + edit */}
      <AnimatePresence>
        {detailBill && !editingBill && (
          <BillDetailDialog
            bill={detailBill}
            onEdit={() => setEditingBill(detailBill)}
            onClose={() => setDetailBill(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingBill && (
          <QuickAddBill
            mode="edit"
            initialBill={editingBill}
            onAdd={handleUpdateBill}
            onClose={() => setEditingBill(null)}
          />
        )}
      </AnimatePresence>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {isAddingBill && (
          <QuickAddBill
            onAdd={handleAddBill}
            onClose={() => setIsAddingBill(false)}
          />
        )}
      </AnimatePresence>

      {/* Bill Scan Modal */}
      <AnimatePresence>
        {isScanningBill && (
          <BillScanModal
            onAdd={handleAddBill}
            onClose={() => setIsScanningBill(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Dev Panel */}
      <AnimatePresence>
        {showDevPanel && (
          <DevPanel 
            onClose={() => setShowDevPanel(false)}
            onDataChange={loadBills}
          />
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="bills"
        onUpgrade={handleUpgrade}
        onPreviewAnyway={() => { setShowUpgradeModal(false); setIsAddingBill(true); }}
      />

      {/* Progressive Hints */}
      <ProgressiveHints />
      <FirstWeekNudges />
    </div>
  );
};

export default Dashboard;
