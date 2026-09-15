import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Scan, X } from 'lucide-react';
import { BillService, isWithinComingUpWindow } from '@/services/BillService';
import { MilestoneService } from '@/services/MilestoneService';
import { showMilestoneToast } from '@/components/MilestoneToast';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { TaxTagService } from '@/services/TaxTagService';
import { TaxRelevanceValue } from '@/components/tax/TaxRelevanceFields';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { PaymentCardService } from '@/services/PaymentCardService';
import { BankAccountService } from '@/services/BankAccountService';
import { UserService } from '@/services/UserService';
import { getCachedWindowDays } from '@/services/supabaseData';
import { useProfile } from '@/hooks/useProfile';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { formatCurrency } from '@/utils/currency';
import { Bill, BillCategory, CATEGORY_LABELS, BILL_LIMITS } from '@/types/bill';
import { canAddBill } from '@/utils/billLimits';
import BillList from '@/components/bills/BillList';
import QuickAddBill from '@/components/QuickAddBill';
import { supabase } from '@/lib/supabase';
import BillDetailDialog from '@/components/bills/BillDetailDialog';
import BillScanModal from '@/components/BillScanModal';
import UpgradeModal from '@/components/UpgradeModal';
import BottomNav from '@/components/BottomNav';
import FabMenu from '@/components/FabMenu';
import UsageCounter from '@/components/shared/UsageCounter';
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
import EditOnly from '@/components/EditOnly';
import { useViewerAccess } from '@/hooks/useViewerAccess';
import { useAccessRedirect } from '@/hooks/useAccessRedirect';
import { ItemFlagService } from '@/services/ItemFlagService';
import { toast } from 'sonner';
import { PeopleService } from '@/services/PeopleService';
import { FlaggedInitialsStack } from '@/components/people/PersonTags';

type StatusFilter = 'all' | 'overdue' | 'pending' | 'paid';
type SortKey = 'due_date' | 'amount' | 'name' | 'category';

const STATUS_CHIPS: { key: StatusFilter; label: (windowDays: number) => string }[] = [
  { key: 'all', label: () => 'All' },
  { key: 'overdue', label: () => 'Needs attention' },
  { key: 'pending', label: (w) => `Coming up (${w}d)` },
  { key: 'paid', label: () => 'Handled' },
];

const SORT_LABELS: Record<SortKey, string> = {
  due_date: 'Due date',
  amount: 'Amount (high to low)',
  name: 'Name (A–Z)',
  category: 'Category',
};

const Bills = () => {
  const { canEdit } = useViewerAccess();
  const { accessLoading } = useAccessRedirect('bills');
  const [searchParams] = useSearchParams();
  const [bills, setBills] = useState<Bill[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('due_date');
  const [category, setCategory] = useState<BillCategory | 'all'>('all');
  const [paidFrom, setPaidFrom] = useState<string>('all');
  const [forYouFilter, setForYouFilter] = useState(false);
  const [forPersonFilter, setForPersonFilter] = useState<string | null>(null);
  const [isAddingBill, setIsAddingBill] = useState(() => searchParams.get('add') === 'bill');
  const [isScanningBill, setIsScanningBill] = useState(false);
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'bills' | 'scan'>('bills');
  const [demoNudge, setDemoNudge] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !BillService.isLoaded());

  const { profile } = useProfile();

  const loadBills = () => {
    const upcoming = BillService.getUpcomingBills();
    const paid = BillService.getAllBills().filter(b => b.status === 'paid');
    setBills([...upcoming, ...paid]);
  };

  useEffect(() => {
    BillService.refresh().then(loadBills).catch(console.error).finally(() => setIsLoading(false));
    ItemFlagService.refresh().catch(console.error);

    const channel = supabase
      .channel('bills-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
        BillService.refresh().then(loadBills).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const allCards = PaymentCardService.getAll();
  const allAccounts = BankAccountService.getAll();
  const hasPaymentSources = allCards.length > 0 || allAccounts.length > 0;

  useEffect(() => {
    const param = searchParams.get('paidFrom');
    if (param) setPaidFrom(param);
    const forParam = searchParams.get('for');
    if (forParam) setForPersonFilter(forParam);
  }, [searchParams]);

  const setPaidFromParam = useCallback((value: string) => {
    setPaidFrom(value);
    const url = new URL(window.location.href);
    if (value === 'all') url.searchParams.delete('paidFrom');
    else url.searchParams.set('paidFrom', value);
    window.history.replaceState(null, '', url);
  }, []);

  const windowDays = getCachedWindowDays();

  const counts = useMemo(
    () => ({
      all: bills.length,
      overdue: bills.filter(b => b.status === 'overdue').length,
      pending: bills.filter(b => isWithinComingUpWindow(b, windowDays)).length,
      paid: bills.filter(b => b.status === 'paid').length,
    }),
    [bills, windowDays],
  );

  const forYouCount = useMemo(() => {
    if (!profile?.personId) return 0;
    const me = PeopleService.getById(profile.personId);
    if (!me) return 0;
    return ItemFlagService.getFlagsForPersonByType(me.id, 'bill')
      .filter((f) => bills.some((b) => b.id === f.itemId))
      .length;
  }, [bills, profile?.personId]);

  const forPersonName = useMemo(() => {
    if (!forPersonFilter) return null;
    const p = PeopleService.getById(forPersonFilter);
    return p?.name ?? null;
  }, [forPersonFilter]);

  const visibleBills = useMemo(() => {
    let list = bills;
    if (forYouFilter) {
      if (profile?.personId) {
        const me = PeopleService.getById(profile.personId);
        if (me) {
          const flaggedIds = ItemFlagService.getFlagsForPersonByType(me.id, 'bill').map((f) => f.itemId);
          list = list.filter((b) => flaggedIds.includes(b.id));
        }
      }
    }
    if (forPersonFilter) {
      const flaggedIds = ItemFlagService.getFlagsForPersonByType(forPersonFilter, 'bill').map((f) => f.itemId);
      list = list.filter((b) => flaggedIds.includes(b.id));
    }
    if (status === 'pending') {
      list = list.filter(b => isWithinComingUpWindow(b, windowDays));
    } else if (status !== 'all') {
      list = list.filter(b => b.status === status);
    }
    if (category !== 'all') list = list.filter(b => b.category === category);
    if (paidFrom !== 'all') {
      if (paidFrom === 'none') {
        list = list.filter(b => !b.paymentCardId && !b.bankAccountId);
      } else if (paidFrom.startsWith('card:')) {
        list = list.filter(b => b.paymentCardId === paidFrom.slice(5));
      } else if (paidFrom.startsWith('account:')) {
        list = list.filter(b => b.bankAccountId === paidFrom.slice(8));
      }
    }

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
  }, [bills, status, category, sort, paidFrom]);

  const paidFromLabel = useMemo(() => {
    if (paidFrom === 'none') return 'an unrecorded source';
    if (paidFrom.startsWith('card:')) {
      const card = PaymentCardService.getById(paidFrom.slice(5));
      return card?.nickname ?? 'this card';
    }
    if (paidFrom.startsWith('account:')) {
      const account = BankAccountService.getById(paidFrom.slice(8));
      return account?.nickname ?? 'this account';
    }
    return '';
  }, [paidFrom]);

  const mode: 'grouped' | 'flat' =
    status === 'all' && sort === 'due_date' && category === 'all' && paidFrom === 'all' ? 'grouped' : 'flat';

  const upcomingTotal = BillService.getComingUpTotal(windowDays);
  const insuranceCount = FinancialInfoService.getInsurance().length;
  const superCount = FinancialInfoService.getSuperannuation().length;

  const isPaid = profile?.isPaid ?? false;

  const handleTryAddBill = () => {
    if (canAddBill(isPaid)) {
      setIsAddingBill(true);
    } else {
      setUpgradeReason('bills');
      setShowUpgradeModal(true);
    }
  };

  const handleTryScanBill = () => {
    if (canAddBill(isPaid)) {
      setIsScanningBill(true);
    } else {
      setUpgradeReason('bills');
      setShowUpgradeModal(true);
    }
  };

  const handleAddBill = async (
    billData: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
    linkedDocumentId?: string,
    tax?: TaxRelevanceValue,
    _billId?: string,
    flaggedPersonIds?: string[]
  ) => {
    const created = await BillService.addBill(billData);
    if (linkedDocumentId) DocumentLinkService.linkToBill(linkedDocumentId, created.id);
    if (tax) TaxTagService.setTag(created.id, 'bill', tax);
    if (flaggedPersonIds && flaggedPersonIds.length > 0) {
      try {
        await ItemFlagService.setFlags('bill', created.id, flaggedPersonIds);
      } catch (e) {
        console.error('Failed to save flags:', e);
        toast.error("Couldn't save who this is for — everything else was saved");
      }
    }
    const msg = MilestoneService.recordMilestone('bills');
    if (msg) showMilestoneToast(msg);
    loadBills();
    setIsAddingBill(false);
    setIsScanningBill(false);
  };

  const handleUpdateBill = async (
    updates: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
    _linkedDocumentId?: string,
    tax?: TaxRelevanceValue,
    billId?: string,
    flaggedPersonIds?: string[]
  ) => {
    const id = billId ?? editingBill?.id;
    if (!id) return;
    await BillService.updateBill(id, {
      ...updates,
      extractionStatus: '',
      extractionConfidence: undefined,
    });
    if (tax) TaxTagService.setTag(id, 'bill', tax);
    if (flaggedPersonIds) {
      try {
        await ItemFlagService.setFlags('bill', id, flaggedPersonIds);
      } catch (e) {
        console.error('Failed to save flags:', e);
        toast.error("Couldn't save who this is for — everything else was saved");
      }
    }
    loadBills();
    setEditingBill(null);
    setDetailBill(null);
    };

  const handleMarkPaid = async (id: string) => {
    await BillService.markAsPaid(id, true);
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
        {accessLoading ? (
          <SkeletonRows rows={4} />
        ) : (
        <>
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
          <UsageCounter
            count={BillService.getBillCount()}
            limit={isPaid ? BILL_LIMITS.paid : BILL_LIMITS.free}
            label="bills"
            variant="inline"
          />
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
                {chip.label(windowDays)} ({counts[chip.key]})
              </button>
            ))}
            {forYouCount > 0 && (
              <button
                onClick={() => setForYouFilter(!forYouFilter)}
                className={cn(
                  'text-sm px-3 py-1.5 rounded-full border transition-colors',
                  forYouFilter
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                For you ({forYouCount})
              </button>
            )}
            {forPersonName && (
              <span className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border border-primary bg-primary/5 text-primary">
                For {forPersonName}
                <button
                  onClick={() => {
                    setForPersonFilter(null);
                    const url = new URL(window.location.href);
                    url.searchParams.delete('for');
                    window.history.replaceState(null, '', url);
                  }}
                  className="p-0.5 rounded-full hover:bg-primary/10"
                  aria-label="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
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

            {hasPaymentSources && (
              <Select value={paidFrom} onValueChange={setPaidFromParam}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Any account or card</SelectItem>
                  {allCards.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Cards</div>
                      {allCards.map(card => (
                        <SelectItem key={`card:${card.id}`} value={`card:${card.id}`}>
                          {card.nickname}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {allAccounts.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Accounts</div>
                      {allAccounts.map(account => (
                        <SelectItem key={`account:${account.id}`} value={`account:${account.id}`}>
                          {account.nickname}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  <SelectItem value="none">Not recorded</SelectItem>
                </SelectContent>
              </Select>
            )}

            <EditOnly>
            <Button onClick={handleTryAddBill} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add bill
            </Button>
            </EditOnly>
          </div>
        </div>

        {paidFrom !== 'all' && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <span>Showing {visibleBills.length} of {bills.length} — everything paid from {paidFromLabel}</span>
            <button onClick={() => setPaidFromParam('all')} className="text-primary hover:underline">Clear</button>
          </div>
        )}

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
                onMarkPaid={canEdit ? handleMarkPaid : undefined}
                onMarkUnpaid={canEdit ? handleMarkUnpaid : undefined}
                onDelete={canEdit ? handleDelete : undefined}
                onEdit={canEdit ? setEditingBill : undefined}
                onOpen={setDetailBill}
                emptyState={
                  paidFrom !== 'all' ? (
                    <div className="text-center py-20">
                      <h2 className="text-lg font-semibold mb-1">Nothing is paid from this.</h2>
                      <button onClick={() => setPaidFromParam('all')} className="text-primary hover:underline text-sm">Clear filter</button>
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <h2 className="text-lg font-semibold mb-1">No bills tracked yet.</h2>
                      <p className="text-muted-foreground mb-6">
                        Add your first one so someone else knows what's running.
                      </p>
                      <EditOnly>
                      <Button onClick={handleTryAddBill} className="gap-1.5">
                        <Plus className="w-4 h-4" /> Add bill
                      </Button>
                      </EditOnly>
                    </div>
                  )
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
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
          <BillScanModal
            onClose={() => setIsScanningBill(false)}
            onUpgradeClick={() => { setUpgradeReason('scan'); setShowUpgradeModal(true); }}
          />
        )}
      </AnimatePresence>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
      />

      {/* FAB with menu */}
      <EditOnly>
      <FabMenu
        choices={[
          { label: 'Scan', icon: <Scan className="w-5 h-5" />, onClick: handleTryScanBill },
          { label: 'Add manually', icon: <Plus className="w-5 h-5" />, onClick: handleTryAddBill },
        ]}
      />
      </EditOnly>

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
