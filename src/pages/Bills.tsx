import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Scan } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { MilestoneService } from '@/services/MilestoneService';
import { showMilestoneToast } from '@/components/MilestoneToast';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { TaxTagService } from '@/services/TaxTagService';
import { TaxRelevanceValue } from '@/components/tax/TaxRelevanceFields';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { UserService } from '@/services/UserService';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { formatCurrency } from '@/utils/currency';
import { Bill, BillCategory, CATEGORY_LABELS } from '@/types/bill';
import { canAddBill } from '@/utils/billLimits';
import BillList from '@/components/bills/BillList';
import QuickAddBill from '@/components/QuickAddBill';
import { supabase } from '@/lib/supabase';
import BillDetailDialog from '@/components/bills/BillDetailDialog';
import BillScanModal from '@/components/BillScanModal';
import UpgradeModal from '@/components/UpgradeModal';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { isDemoModeActive } from '@/demo/demoFlag';
import { SkeletonRows } from '@/components/ui/skeleton';

type StatusFilter = 'all' | 'overdue' | 'due_soon' | 'pending' | 'paid';
type SortKey = 'due_date' | 'amount' | 'name' | 'category';

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Needs attention' },
  { key: 'due_soon', label: 'Due soon' },
  { key: 'pending', label: 'Coming up' },
  { key: 'paid', label: 'Handled' },
];

const SORT_LABELS: Record<SortKey, string> = {
  due_date: 'Due date',
  amount: 'Amount (high to low)',
  name: 'Name (A–Z)',
  category: 'Category',
};

const Bills = () => {
  const [searchParams] = useSearchParams();
  const [bills, setBills] = useState<Bill[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('due_date');
  const [category, setCategory] = useState<BillCategory | 'all'>('all');
  const [isAddingBill, setIsAddingBill] = useState(() => searchParams.get('add') === 'bill');
  const [isScanningBill, setIsScanningBill] = useState(false);
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [demoNudge, setDemoNudge] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !BillService.isLoaded());

  const loadBills = () => {
    const upcoming = BillService.getUpcomingBills();
    const paid = BillService.getAllBills().filter(b => b.status === 'paid');
    setBills([...upcoming, ...paid]);
  };

  useEffect(() => {
    BillService.refresh().then(loadBills).catch(console.error).finally(() => setIsLoading(false));

    const channel = supabase
      .channel('bills-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
        BillService.refresh().then(loadBills).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const counts = useMemo(
    () => ({
      all: bills.length,
      overdue: bills.filter(b => b.status === 'overdue').length,
      due_soon: bills.filter(b => b.status === 'due_soon').length,
      pending: bills.filter(b => b.status === 'pending').length,
      paid: bills.filter(b => b.status === 'paid').length,
    }),
    [bills],
  );

  const visibleBills = useMemo(() => {
    let list = bills;
    if (status !== 'all') list = list.filter(b => b.status === status);
    if (category !== 'all') list = list.filter(b => b.category === category);

    const sorted = [...list];

    // Pin processing and needs_review bills at the top, regardless of sort
    const extractionPriority = (b: Bill): number => {
      if (b.extractionStatus === 'processing') return 0;
      if (b.extractionStatus === 'needs_review') return 1;
      return 2;
    };
    sorted.sort((a, b) => extractionPriority(a) - extractionPriority(b));

    // Within each extraction group, apply the user's sort
    const withinGroup = (a: Bill, b: Bill) => {
      if (sort === 'amount') return (b.amount ?? 0) - (a.amount ?? 0);
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'category')
        return String(a.category ?? '').localeCompare(String(b.category ?? ''));
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    };

    // Stable sort within each priority group
    const groups: Bill[] = [];
    const group0 = sorted.filter(b => extractionPriority(b) === 0).sort(withinGroup);
    const group1 = sorted.filter(b => extractionPriority(b) === 1).sort(withinGroup);
    const group2 = sorted.filter(b => extractionPriority(b) === 2).sort(withinGroup);
    groups.push(...group0, ...group1, ...group2);
    return groups;
  }, [bills, status, category, sort]);

  const mode: 'grouped' | 'flat' =
    status === 'all' && sort === 'due_date' && category === 'all' ? 'grouped' : 'flat';

  const upcomingTotal = BillService.getUpcomingTotal();
  const insuranceCount = FinancialInfoService.getInsurance().length;
  const superCount = FinancialInfoService.getSuperannuation().length;

  const handleTryAddBill = () => {
    if (canAddBill()) setIsAddingBill(true);
    else setShowUpgradeModal(true);
    setShowFabMenu(false);
  };

  const handleTryScanBill = () => {
    if (canAddBill()) setIsScanningBill(true);
    else setShowUpgradeModal(true);
    setShowFabMenu(false);
  };

  const handleAddBill = async (
    billData: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
    linkedDocumentId?: string,
    tax?: TaxRelevanceValue
  ) => {
    const created = await BillService.addBill(billData);
    if (linkedDocumentId) DocumentLinkService.linkToBill(linkedDocumentId, created.id);
    if (tax) TaxTagService.setTag(created.id, 'bill', tax);
    const msg = MilestoneService.recordMilestone('bills');
    if (msg) showMilestoneToast(msg);
    loadBills();
    setIsAddingBill(false);
    setIsScanningBill(false);
  };

  const handleUpdateBill = async (
    updates: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
    _linkedDocumentId?: string,
    tax?: TaxRelevanceValue
  ) => {
    if (!editingBill) return;
    await BillService.updateBill(editingBill.id, {
      ...updates,
      extractionStatus: '',
      extractionConfidence: undefined,
    });
    if (tax) TaxTagService.setTag(editingBill.id, 'bill', tax);
    loadBills();
    setEditingBill(null);
    setDetailBill(null);
  };

  const handleMarkPaid = async (id: string) => {
    await BillService.markAsPaid(id);
    loadBills();
    if (isDemoModeActive()) {
      setDemoNudge(true);
      setTimeout(() => setDemoNudge(false), 4000);
    }
  };
  const handleMarkUnpaid = async (id: string) => {
    await BillService.markAsUnpaid(id);
    loadBills();
  };
  const [pendingDeleteBill, setPendingDeleteBill] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (!UserService.shouldWarnBeforeDelete('bill')) {
      void BillService.deleteBill(id).then(loadBills);
      return;
    }
    setPendingDeleteBill(id);
  };

  const confirmDeleteBill = async () => {
    if (pendingDeleteBill) {
      await BillService.deleteBill(pendingDeleteBill);
      loadBills();
    }
    setPendingDeleteBill(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pt-16">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <h1 className="text-xl font-bold">Bills &amp; Commitments</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 lg:pt-8 max-w-4xl">
        <h1 className="text-2xl font-semibold hidden lg:block mb-2">Bills &amp; Commitments</h1>

        {demoNudge && (
          <p className="text-sm text-muted-foreground italic mb-4">
            That's it. One tap, and the whole family always knows it's done.
          </p>
        )}

        {/* Totals strip */}
        <p className="text-sm text-muted-foreground mb-4">
          <span>{formatCurrency(upcomingTotal)} coming up</span>
          {' · '}
          <Link to="/financial" className="hover:text-foreground underline-offset-2 hover:underline">
            {insuranceCount} insurance {insuranceCount === 1 ? 'policy' : 'policies'}
          </Link>
          {' · '}
          <Link to="/financial" className="hover:text-foreground underline-offset-2 hover:underline">
            {superCount} savings &amp; retirement {superCount === 1 ? 'account' : 'accounts'}
          </Link>
        </p>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_CHIPS.map(chip => (
              <button
                key={chip.key}
                onClick={() => setStatus(chip.key)}
                className={cn(
                  'text-sm px-3 py-1.5 rounded-full border transition-colors',
                  status === chip.key
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
              <SelectTrigger className="w-[190px]">
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

            <Select value={category} onValueChange={v => setCategory(v as BillCategory | 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleTryAddBill} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add bill
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }}>
              <SkeletonRows rows={4} />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <BillList
                bills={visibleBills}
                mode={mode}
                onMarkPaid={handleMarkPaid}
                onMarkUnpaid={handleMarkUnpaid}
                onDelete={handleDelete}
                onEdit={setEditingBill}
                onOpen={setDetailBill}
                emptyState={
                  <div className="text-center py-20">
                    <h2 className="text-lg font-semibold mb-1">No bills tracked yet.</h2>
                    <p className="text-muted-foreground mb-6">
                      Add your first one so someone else knows what's running.
                    </p>
                    <Button onClick={handleTryAddBill} className="gap-1.5">
                      <Plus className="w-4 h-4" /> Add bill
                    </Button>
                  </div>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isAddingBill && (
          <QuickAddBill onAdd={handleAddBill} onClose={() => setIsAddingBill(false)} />
        )}
      </AnimatePresence>

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

      <AnimatePresence>
        {isScanningBill && (
          <BillScanModal onClose={() => setIsScanningBill(false)} onUpgradeClick={() => setShowUpgradeModal(true)} />
        )}
      </AnimatePresence>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="scan"
        onUpgrade={() => {
          UserService.saveSettings({ userType: 'paid', hasEventsAccess: true });
          setShowUpgradeModal(false);
        }}
        onPreviewAnyway={() => {
          setShowUpgradeModal(false);
          setIsAddingBill(true);
        }}
      />

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

      <ConfirmDeleteDialog
        open={!!pendingDeleteBill}
        onOpenChange={(o) => { if (!o) setPendingDeleteBill(null); }}
        warnKey="bill"
        title="Delete this bill?"
        onConfirm={confirmDeleteBill}
      />

      <BottomNav />
    </div>
  );
};

export default Bills;
