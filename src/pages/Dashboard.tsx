import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Scan, Shield } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { getCachedWindowDays } from '@/services/supabaseData';
import { MilestoneService } from '@/services/MilestoneService';
import { showMilestoneToast } from '@/components/MilestoneToast';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { EventService } from '@/services/EventService';
import { PeopleService } from '@/services/PeopleService';
import { useProfile } from '@/hooks/useProfile';
import { useViewerAccess } from '@/hooks/useViewerAccess';
import { refreshAllData } from '@/services/loadAllData';
import { UserService } from '@/services/UserService';
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
import AdminOnly from '@/components/AdminOnly';
import DashboardActionStrip from '@/components/DashboardActionStrip';
import OrganizationStrip from '@/components/OrganizationStrip';
import PeopleBubbleRow from '@/components/PeopleBubbleRow';
import { SkeletonRows } from '@/components/ui/skeleton';

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
  const [billsLoading, setBillsLoading] = useState(() => !BillService.isLoaded());
  const [dataError, setDataError] = useState(false);
  const needsAttentionRef = useRef<HTMLDivElement>(null);

  const { role, isAdmin, canEdit, canSee, accessLoading } = useViewerAccess();

  useEffect(() => {
    UserService.initializeTheme();
    refreshAllData()
      .then(loadBills)
      .catch(() => setDataError(true))
      .finally(() => setBillsLoading(false));
    loadBills();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDevPanel(prev => !prev);
      }
    };

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
    await BillService.markAsPaid(id, true);
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

  const getSectionTitle = (section: 'overdue' | 'upcoming' | 'paid') => {
    const labels = {
      overdue: 'Needs Attention',
      upcoming: 'Coming Up',
      paid: 'Handled',
    };
    return labels[section];
  };

  const windowDays = getCachedWindowDays();
  const comingUpTotal = BillService.getComingUpTotal(windowDays);
  const outstandingTotal = BillService.getOutstandingTotal();
  const spending = BillService.getSpendingByCategory();
  const activeEvents = EventService.getActiveEvents();

  const overdueBills = bills.filter(b => b.status === 'overdue');
  const hasSampleBills = bills.some(b => b.isSample) || activeEvents.some(e => e.isSample);

  const canSeeBills = accessLoading || isAdmin || canSee('bills');
  const canSeeDocuments = accessLoading || isAdmin || canSee('documents');
  const canSeeTaxDocs = accessLoading || isAdmin || canSee('tax_documents');
  const canSeeFinancial = accessLoading || isAdmin || canSee('financial_info');
  const canSeeEvents = accessLoading || isAdmin || canSee('events');

  const canShowPeopleCard = useMemo(() => {
    if (accessLoading || isAdmin) return true;
    const me = PeopleService.getAll().find((p) => p.userId === profile?.userId);
    if (!me) return true;
    return me.role === 'household';
  }, [accessLoading, isAdmin, profile?.userId]);

  const canAddBills = isAdmin || (canEdit && canSee('bills'));

  const ownerName = useMemo(() => {
    const owner = PeopleService.getAll().find((p) => p.accessLevel === 'owner');
    return owner?.name?.split(' ')[0] ?? 'the owner';
  }, []);

  const bannerText = useMemo(() => {
    if (accessLoading) return 'Loading…';
    if (role === 'owner') return 'Only you and people you invite can see this';
    if (role === 'co_owner') return `You and ${ownerName} manage this household together`;
    const me = PeopleService.getAll().find((p) => p.userId === profile?.userId);
    if (me?.role === 'advisor' || me?.role === 'accountant') {
      return `${ownerName} has invited you in as an advisor`;
    }
    return `${ownerName} has trusted you with a view into this household`;
  }, [accessLoading, role, ownerName, profile?.userId]);

  const bentoTileCount = (canSeeBills ? 1 : 0) + 1 + (canShowPeopleCard ? 1 : 0);
  const bentoColsClass =
    bentoTileCount >= 3 ? 'lg:grid-cols-[5fr_4fr_5fr]' :
    bentoTileCount === 2 ? 'lg:grid-cols-2' :
    'lg:grid-cols-1';

  const retryLoad = () => {
    setDataError(false);
    setBillsLoading(true);
    refreshAllData()
      .then(loadBills)
      .catch(() => setDataError(true))
      .finally(() => setBillsLoading(false));
  };

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
      />

      <main className="container mx-auto px-4 pt-20">
        {/* Utility line: role-aware trust signal + clear samples + add bill */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            {bannerText}
          </p>
          <div className="flex items-center gap-3">
            {hasSampleBills && isAdmin && (
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
            {canAddBills && <AddButton label="Add bill" onClick={handleTryAddBill} />}
          </div>
        </div>

        {/* Bento tile row — only renders visible tiles */}
        <div className={`grid grid-cols-2 ${bentoColsClass} gap-3 mb-6`}>
          {canSeeBills && (
            <div className="col-span-2 lg:col-span-1">
              <DashboardActionStrip
                overdueCount={overdueBills.length}
                comingUpTotal={comingUpTotal}
                comingUpWindowDays={windowDays}
                outstandingTotal={outstandingTotal}
                onAttentionClick={() => needsAttentionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
            </div>
          )}
          <OrganizationStrip
            showBills={canSeeBills}
            showDocuments={canSeeDocuments || canSeeTaxDocs}
            showPeople={canShowPeopleCard}
          />
          {canShowPeopleCard && <PeopleBubbleRow />}
        </div>

        {/* Household setup (admin only, hidden when complete) */}
        <AdminOnly><HouseholdSetupWidget /></AdminOnly>

        {canSeeBills && overdueBills.length > 0 && (
          <div ref={needsAttentionRef} className="mb-6">
            <AnimatePresence mode="wait">
              {billsLoading ? (
                <motion.div key="skeleton" exit={{ opacity: 0 }}>
                  <SkeletonRows rows={3} />
                </motion.div>
              ) : dataError ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Couldn't load your bills.</p>
                  <button onClick={retryLoad} className="text-sm text-primary hover:underline">Retry</button>
                </div>
              ) : (
                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <BillList
                    bills={overdueBills}
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
        )}

        {canSeeEvents && activeEvents.length > 0 && (
          <div className="mb-6">
            <ActiveEventsWidget events={activeEvents} />
          </div>
        )}

        {(() => {
          const hasHouseholdRecords = canSeeDocuments || canSeeFinancial || canSeeTaxDocs;
          const hasSpendingAndBills = canSeeBills;
          if (!hasHouseholdRecords && !hasSpendingAndBills) return null;
          const bothColumns = hasHouseholdRecords && hasSpendingAndBills;
          return (
            <div className={`grid grid-cols-1 ${bothColumns ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6 mb-6`}>
              {hasHouseholdRecords && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Household Records</p>
                  <div className="space-y-2">
                    {canSeeDocuments && <DocumentsWidget />}
                    {canSeeFinancial && <FinancialSnapshotWidget />}
                    {canSeeTaxDocs && <TaxWidget />}
                    <AdvisorWidget />
                  </div>
                </div>
              )}
              {hasSpendingAndBills && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Spending &amp; Bills</p>
                  <div className="space-y-2">
                    <SpendingChart spending={spending} />
                    <BillsWidget onOpen={setDetailBill} />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Empty State — only for roles that can see bills */}
        {canSeeBills && !billsLoading && !dataError && bills.length === 0 && canAddBills && (
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

      {/* FAB — only for roles that can add bills */}
      {canAddBills && (
        <FabMenu
          choices={[
            { label: 'Scan', icon: <Scan className="w-5 h-5" />, onClick: handleTryScanBill },
            { label: 'Add manually', icon: <Plus className="w-5 h-5" />, onClick: handleTryAddBill },
          ]}
          onOpenChange={setFabMenuOpen}
        />
      )}

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
      />

      <DashboardSuggestions fabMenuOpen={fabMenuOpen} />
    </div>
  );
};

export default Dashboard;
