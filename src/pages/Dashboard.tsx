import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isDemoModeActive } from '@/demo/demoFlag';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Scan, Shield } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { MilestoneService } from '@/services/MilestoneService';
import { showMilestoneToast } from '@/components/MilestoneToast';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { EventService } from '@/services/EventService';
import { useProfile } from '@/hooks/useProfile';
import { refreshAllData } from '@/services/loadAllData';
import { UserService } from '@/services/UserService';
import { AccessService } from '@/services/AccessService';
import { Bill } from '@/types/bill';
import { canAddBill } from '@/utils/billLimits';
import BillList from '@/components/bills/BillList';
import QuickAddBill from '@/components/QuickAddBill';
import BillDetailDialog from '@/components/bills/BillDetailDialog';
import BillScanModal from '@/components/BillScanModal';
import BottomNav from '@/components/BottomNav';
import FabMenu from '@/components/FabMenu';
import AddButton from '@/components/AddButton';
import DevPanel from '@/components/DevPanel';
import DashboardHeader from '@/components/DashboardHeader';
import SpendingChart from '@/components/SpendingChart';
import ActiveEventsWidget from '@/components/ActiveEventsWidget';
import UpgradeModal from '@/components/UpgradeModal';
import DashboardSuggestions from '@/components/DashboardSuggestions';
import DocumentsWidget from '@/components/DocumentsWidget';
import AdvisorWidget from '@/components/AdvisorWidget';
import BillsWidget from '@/components/BillsWidget';
import FinancialSnapshotWidget from '@/components/FinancialSnapshotWidget';
import TaxWidget from '@/components/TaxWidget';
import HouseholdSetupWidget from '@/components/HouseholdSetupWidget';
import DashboardActionStrip from '@/components/DashboardActionStrip';
import OrganizationStrip from '@/components/OrganizationStrip';
import PeopleBubbleRow from '@/components/PeopleBubbleRow';
import { SkeletonRows, SkeletonCard } from '@/components/ui/skeleton';

const Dashboard = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchParams] = useSearchParams();
  const [isAddingBill, setIsAddingBill] = useState(() => searchParams.get('add') === 'bill');
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isScanningBill, setIsScanningBill] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isFamilyView, setIsFamilyView] = useState(false);
  const [billsLoading, setBillsLoading] = useState(() => !BillService.isLoaded());
  const needsAttentionRef = useRef<HTMLDivElement>(null);

  // Initialize data on mount
  useEffect(() => {
    UserService.initializeTheme();
    refreshAllData().then(loadBills).catch(console.error).finally(() => setBillsLoading(false));
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


  const { profile } = useProfile();
  const isPaid = profile?.isPaid ?? false;

  const handleTryAddBill = () => {
    if (canAddBill(isPaid)) {
      setIsAddingBill(true);
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handleTryScanBill = () => {
    if (canAddBill(isPaid)) {
      setIsScanningBill(true);
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handleAddBill = async (
    billData: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
    linkedDocumentId?: string
  ) => {
    const created = await BillService.addBill(billData);
    if (linkedDocumentId) DocumentLinkService.linkToBill(linkedDocumentId, created.id);
    const msg = MilestoneService.recordMilestone('bills');
    if (msg) showMilestoneToast(msg);
    loadBills();
    setIsAddingBill(false);
    setIsScanningBill(false);
  };

  const handleUpdateBill = async (updates: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    if (!editingBill) return;
    await BillService.updateBill(editingBill.id, updates);
    loadBills();
    setEditingBill(null);
    setDetailBill(null);
  };

  const handleMarkPaid = async (id: string) => {
    await BillService.markAsPaid(id);
    loadBills();
  };

  const handleMarkUnpaid = async (id: string) => {
    await BillService.markAsUnpaid(id);
    loadBills();
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm('Delete this bill? You can restore it from Recently Deleted within 30 days.')) return;
    await BillService.deleteBill(id);
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

  const hasSampleBills = bills.some(b => b.isSample) || activeEvents.some(e => e.isSample);

  // Jan-Apr: tax records matter more, so lift that widget up the stack
  const isTaxSeason = new Date().getMonth() <= 3;

  return (
    <div className="min-h-screen bg-background pb-24">
      <DashboardHeader 
        onClearSamples={async () => {
          await Promise.all([
            BillService.clearSampleBills(),
            EventService.clearSampleEvents(),
          ]);
          loadBills();
        }}
        hasSampleBills={hasSampleBills}
        isFamilyView={isFamilyView}
        onToggleFamilyView={() => setIsFamilyView(!isFamilyView)}
      />

      <main className="container mx-auto px-4 pt-20">
        {/* Family View Banner */}
        {isFamilyView && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2"
          >
            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="text-sm text-foreground">
              <strong>Family View</strong> — Here's what needs to be handled if you're stepping in
              {AccessService.getActivePeople().length === 0 && (
                <span className="block text-muted-foreground mt-0.5">
                  Once you add someone with access, this view will show exactly what they'd see.
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Utility line: trust signal + clear samples + add bill */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Only you and people you invite can see this
          </p>
          <div className="flex items-center gap-3">
            {hasSampleBills && (
              <button
                onClick={async () => {
                  await Promise.all([
                    BillService.clearSampleBills(),
                    EventService.clearSampleEvents(),
                  ]);
                  loadBills();
                }}
                className="hidden lg:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear samples
              </button>
            )}
            <AddButton label="Add bill" onClick={handleTryAddBill} />
          </div>
        </div>

        {/* Bento tile row */}
        <div className="grid grid-cols-2 lg:grid-cols-[1.6fr_1.3fr_1fr] gap-3 mb-6">
          <div className="col-span-2 lg:col-span-1">
            <DashboardActionStrip
              overdueCount={overdueBills.length}
              dueSoonCount={dueSoonBills.length}
              upcomingTotal={upcomingTotal}
              isFamilyView={isFamilyView}
              onAttentionClick={() => needsAttentionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
          </div>
          <OrganizationStrip />
          <PeopleBubbleRow />
        </div>

        {/* Needs Attention bill list */}
        <div ref={needsAttentionRef}>
          <AnimatePresence mode="wait">
            {billsLoading ? (
              <motion.div key="skeleton" exit={{ opacity: 0 }}>
                <SkeletonRows rows={3} />
              </motion.div>
            ) : (
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Household Records cluster */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-6">
          <DocumentsWidget />
          <FinancialSnapshotWidget />
          <TaxWidget />
          <AdvisorWidget />
        </div>

        {/* Household setup (hidden when all complete) */}
        <HouseholdSetupWidget />

        {/* Spending Chart */}
        <SpendingChart spending={spending} />

        {/* Active Events Widget */}
        <ActiveEventsWidget events={activeEvents} />

        <BillsWidget onOpen={setDetailBill} />

        {bills.length > 0 && (
          <Link
            to={isDemoModeActive() ? '/demo/bills' : '/bills'}
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
      <FabMenu
        choices={[
          { label: 'Scan', icon: <Scan className="w-5 h-5" />, onClick: handleTryScanBill },
          { label: 'Add manually', icon: <Plus className="w-5 h-5" />, onClick: handleTryAddBill },
        ]}
        onOpenChange={setFabMenuOpen}
      />

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
      <BottomNav
        isFamilyView={isFamilyView}
        onToggleFamilyView={() => setIsFamilyView(!isFamilyView)}
      />

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
      />

      <DashboardSuggestions fabMenuOpen={fabMenuOpen} />
    </div>
  );
};

export default Dashboard;
