import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Plus, Shield, Wallet, FileText, Trash2, Pencil as Edit2, ExternalLink, TrendingUp, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import FinancialAccessCard from '@/components/financial/FinancialAccessCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FinancialInfoService, 
  InsuranceEntry, 
  SuperannuationEntry, 
  MiscFinancialEntry,
  IncomeSourceEntry,
  DebtEntry,
  DebtType,
  InsuranceType,
  INSURANCE_TYPE_LABELS,
  DEBT_TYPE_LABELS,
  AccountType,
  ACCOUNT_TYPE_LABELS,
} from '@/services/FinancialInfoService';
import { MilestoneService } from '@/services/MilestoneService';
import { showMilestoneToast } from '@/components/MilestoneToast';
import BottomNav from '@/components/BottomNav';
import LinkPicker, { LinkPickerOption } from '@/components/shared/LinkPicker';
import { BillService } from '@/services/BillService';
import { BankAccountService } from '@/services/BankAccountService';
import { DocumentService } from '@/services/DocumentService';
import DismissibleIntro from '@/components/DismissibleIntro';
import { SkeletonRows, SkeletonCard } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currency';
import BankAccountPicker from '@/components/bills/BankAccountPicker';
import CardPicker from '@/components/bills/CardPicker';

const OverviewTab = ({
  insurance,
  superannuation,
  income,
  debts,
  misc,
  onEditInsurance,
  onEditSuper,
  onEditIncome,
  onEditDebt,
  onEditMisc,
  onDeleteInsurance,
  onDeleteSuper,
  onDeleteIncome,
  onDeleteDebt,
  onDeleteMisc,
  onAddInsurance,
  onAddSuper,
  onAddIncome,
  onAddDebt,
  onAddMisc,
}: {
  insurance: InsuranceEntry[];
  superannuation: SuperannuationEntry[];
  income: IncomeSourceEntry[];
  debts: DebtEntry[];
  misc: MiscFinancialEntry[];
  onEditInsurance: (id: string) => void;
  onEditSuper: (id: string) => void;
  onEditIncome: (id: string) => void;
  onEditDebt: (id: string) => void;
  onEditMisc: (id: string) => void;
  onDeleteInsurance: (id: string) => Promise<void>;
  onDeleteSuper: (id: string) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
  onDeleteDebt: (id: string) => Promise<void>;
  onDeleteMisc: (id: string) => Promise<void>;
  onAddInsurance: () => void;
  onAddSuper: () => void;
  onAddIncome: () => void;
  onAddDebt: () => void;
  onAddMisc: () => void;
}) => {
  const isEmpty =
    insurance.length === 0 &&
    superannuation.length === 0 &&
    income.length === 0 &&
    debts.length === 0 &&
    misc.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon={Shield}
        title="Nothing recorded yet"
        description="Start by adding an insurance policy, then build out the rest from there"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Insurance */}
      {insurance.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            Insurance
            <button onClick={onAddInsurance} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </h2>
          <div className="space-y-4">
            {insurance.map((entry) => (
              <InsuranceCard
                key={entry.id}
                entry={entry}
                onEdit={() => onEditInsurance(entry.id)}
                onDelete={() => onDeleteInsurance(entry.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Accounts & Retirement */}
      {superannuation.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            Accounts &amp; Retirement
            <button onClick={onAddSuper} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </h2>
          <div className="space-y-4">
            {superannuation.map((entry) => (
              <SuperCard
                key={entry.id}
                entry={entry}
                onEdit={() => onEditSuper(entry.id)}
                onDelete={() => onDeleteSuper(entry.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Income */}
      {income.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            Income
            <button onClick={onAddIncome} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </h2>
          <div className="space-y-4">
            {income.map((entry) => (
              <SimpleCard
                key={entry.id}
                title={entry.sourceName}
                amountLabel={`${formatCurrency(entry.approximateAmount)} approx.`}
                linkedDocumentId={entry.linkedDocumentId}
                notes={entry.notes}
                onEdit={() => onEditIncome(entry.id)}
                onDelete={() => onDeleteIncome(entry.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Debts */}
      {debts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            Debts
            <button onClick={onAddDebt} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </h2>
          <div className="space-y-4">
            {debts.map((entry) => (
              <SimpleCard
                key={entry.id}
                title={entry.owedTo}
                badge={DEBT_TYPE_LABELS[entry.type]}
                amountLabel={`${formatCurrency(entry.approximateBalance)} approx. balance`}
                linkedDocumentId={entry.linkedDocumentId}
                notes={entry.notes}
                onEdit={() => onEditDebt(entry.id)}
                onDelete={() => onDeleteDebt(entry.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Other */}
      {misc.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            Other
            <button onClick={onAddMisc} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </h2>
          <div className="space-y-4">
            {misc.map((entry) => (
              <SimpleCard
                key={entry.id}
                title={entry.key}
                amountLabel={entry.value || undefined}
                linkedDocumentId={entry.linkedDocumentId}
                notes={entry.notes}
                onEdit={() => onEditMisc(entry.id)}
                onDelete={() => onDeleteMisc(entry.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const FinancialInfo = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [insurance, setInsurance] = useState<InsuranceEntry[]>([]);
  const [superannuation, setSuperannuation] = useState<SuperannuationEntry[]>([]);
  const [misc, setMisc] = useState<MiscFinancialEntry[]>([]);
  const [income, setIncome] = useState<IncomeSourceEntry[]>([]);
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  
  // Modal states
  const [showInsuranceModal, setShowInsuranceModal] = useState(() => searchParams.get('add') === 'insurance');
  const [showSuperModal, setShowSuperModal] = useState(false);
  const [showMiscModal, setShowMiscModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !FinancialInfoService.isLoaded());

  useEffect(() => {
    FinancialInfoService.refresh().then(loadData).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const loadData = () => {
    setInsurance(FinancialInfoService.getInsurance());
    setSuperannuation(FinancialInfoService.getSuperannuation());
    setMisc(FinancialInfoService.getMisc());
    setIncome(FinancialInfoService.getIncome());
    setDebts(FinancialInfoService.getDebts());
  };

  const totalDebt = FinancialInfoService.getTotalDebt();
  const totalIncome = FinancialInfoService.getTotalIncome();

  return (
    <div className="min-h-screen bg-background pb-24 lg:pt-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Financial Snapshot</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 lg:pt-8 max-w-4xl">
        <h1 className="text-2xl font-semibold hidden lg:block mb-4">Financial Snapshot</h1>
        <DismissibleIntro storageKey="billvie_financial_intro">
          The numbers a spouse or advisor would need to know — what's protected, what's owed, what's coming in. Not a budget, just the facts someone would need if you weren't the one explaining them.
        </DismissibleIntro>
        <FinancialAccessCard />
        {/* Summary Cards */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton-cards" exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3 mb-6">
              <SkeletonCard />
              <SkeletonCard />
            </motion.div>
          ) : (
            <motion.div key="summary-cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Owed</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(totalDebt)}</p>
                <p className="text-xs text-muted-foreground">
                  across {debts.length} {debts.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Income sources</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(totalIncome)}</p>
                <p className="text-xs text-muted-foreground">
                  from {income.length} {income.length === 1 ? 'source' : 'sources'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex overflow-x-auto no-scrollbar gap-1 mb-6 text-xs sm:text-sm">
            <TabsTrigger value="overview" className="px-3 flex-shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="insurance" className="px-1 flex-shrink-0">Insurance</TabsTrigger>
            <TabsTrigger value="super" className="px-1 flex-shrink-0">
              <span className="lg:hidden">Accounts</span>
              <span className="hidden lg:inline">Accounts &amp; Retirement</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="px-1 flex-shrink-0">Income</TabsTrigger>
            <TabsTrigger value="debts" className="px-1 flex-shrink-0">Debts</TabsTrigger>
            <TabsTrigger value="misc" className="px-1 flex-shrink-0">Other</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="skeleton-rows" exit={{ opacity: 0 }}>
                  <SkeletonRows rows={4} />
                </motion.div>
              ) : (
                <motion.div key="overview-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <OverviewTab
                    insurance={insurance}
                    superannuation={superannuation}
                    income={income}
                    debts={debts}
                    misc={misc}
                    onEditInsurance={(id) => { setEditingItem(id); setShowInsuranceModal(true); }}
                    onEditSuper={(id) => { setEditingItem(id); setShowSuperModal(true); }}
                    onEditIncome={(id) => { setEditingItem(id); setShowIncomeModal(true); }}
                    onEditDebt={(id) => { setEditingItem(id); setShowDebtModal(true); }}
                    onEditMisc={(id) => { setEditingItem(id); setShowMiscModal(true); }}
                    onDeleteInsurance={async (id) => { await FinancialInfoService.deleteInsurance(id); loadData(); }}
                    onDeleteSuper={async (id) => { await FinancialInfoService.deleteSuperannuation(id); loadData(); }}
                    onDeleteIncome={async (id) => { await FinancialInfoService.deleteIncome(id); loadData(); }}
                    onDeleteDebt={async (id) => { await FinancialInfoService.deleteDebt(id); loadData(); }}
                    onDeleteMisc={async (id) => { await FinancialInfoService.deleteMisc(id); loadData(); }}
                    onAddInsurance={() => { setEditingItem(null); setShowInsuranceModal(true); }}
                    onAddSuper={() => { setEditingItem(null); setShowSuperModal(true); }}
                    onAddIncome={() => { setEditingItem(null); setShowIncomeModal(true); }}
                    onAddDebt={() => { setEditingItem(null); setShowDebtModal(true); }}
                    onAddMisc={() => { setEditingItem(null); setShowMiscModal(true); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance">
            <div className="space-y-4">
              {insurance.map((entry) => (
                <InsuranceCard 
                  key={entry.id} 
                  entry={entry}
                  onEdit={() => {
                    setEditingItem(entry.id);
                    setShowInsuranceModal(true);
                  }}
                  onDelete={async () => {
                    await FinancialInfoService.deleteInsurance(entry.id);
                    loadData();
                  }}
                />
              ))}

              {insurance.length === 0 && (
                <EmptyState 
                  icon={Shield}
                  title="No insurance policies"
                  description="Track your insurance policies and renewal dates"
                />
              )}

              <Button 
                onClick={() => {
                  setEditingItem(null);
                  setShowInsuranceModal(true);
                }}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Insurance
              </Button>
            </div>
          </TabsContent>

          {/* Superannuation Tab */}
          <TabsContent value="super">
            <div className="space-y-4">
              {superannuation.map((entry) => (
                <SuperCard 
                  key={entry.id} 
                  entry={entry}
                  onEdit={() => {
                    setEditingItem(entry.id);
                    setShowSuperModal(true);
                  }}
                  onDelete={async () => {
                    await FinancialInfoService.deleteSuperannuation(entry.id);
                    loadData();
                  }}
                />
              ))}

              {superannuation.length === 0 && (
                <EmptyState 
                  icon={Wallet}
                  title="No accounts yet"
                  description="Bank accounts, savings, and retirement funds — so someone else knows what exists"
                />
              )}

              <Button 
                onClick={() => {
                  setEditingItem(null);
                  setShowSuperModal(true);
                }}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </div>
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income">
            <div className="space-y-4">
              {income.map((entry) => (
                <SimpleCard
                  key={entry.id}
                  title={entry.sourceName}
                  amountLabel={`${formatCurrency(entry.approximateAmount)} approx.`}
                  notes={entry.notes}
                  onEdit={() => {
                    setEditingItem(entry.id);
                    setShowIncomeModal(true);
                  }}
                  onDelete={async () => {
                    await FinancialInfoService.deleteIncome(entry.id);
                    loadData();
                  }}
                />
              ))}

              {income.length === 0 && (
                <EmptyState
                  icon={TrendingUp}
                  title="No income sources yet"
                  description="Where money comes in — so someone else would know"
                />
              )}

              <Button
                onClick={() => {
                  setEditingItem(null);
                  setShowIncomeModal(true);
                }}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Income Source
              </Button>
            </div>
          </TabsContent>

          {/* Debts Tab */}
          <TabsContent value="debts">
            <div className="space-y-4">
              {debts.map((entry) => (
                <SimpleCard
                  key={entry.id}
                  title={entry.owedTo}
                  badge={DEBT_TYPE_LABELS[entry.type]}
                  amountLabel={`${formatCurrency(entry.approximateBalance)} approx. balance`}
                  notes={entry.notes}
                  onEdit={() => {
                    setEditingItem(entry.id);
                    setShowDebtModal(true);
                  }}
                  onDelete={async () => {
                    await FinancialInfoService.deleteDebt(entry.id);
                    loadData();
                  }}
                />
              ))}

              {debts.length === 0 && (
                <EmptyState
                  icon={Landmark}
                  title="No debts or loans yet"
                  description="What's owed and how it's paid — in plain terms"
                />
              )}

              <Button
                onClick={() => {
                  setEditingItem(null);
                  setShowDebtModal(true);
                }}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Debt or Loan
              </Button>
            </div>
          </TabsContent>

          {/* Misc Tab */}
          <TabsContent value="misc">
            <div className="space-y-4">
              {misc.map((entry) => (
                <MiscCard 
                  key={entry.id} 
                  entry={entry}
                  onEdit={() => {
                    setEditingItem(entry.id);
                    setShowMiscModal(true);
                  }}
                  onDelete={async () => {
                    await FinancialInfoService.deleteMisc(entry.id);
                    loadData();
                  }}
                />
              ))}

              {misc.length === 0 && (
                <EmptyState 
                  icon={FileText}
                  title="No other financial info"
                  description="Store miscellaneous financial details"
                />
              )}

              <Button 
                onClick={() => {
                  setEditingItem(null);
                  setShowMiscModal(true);
                }}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Info
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Insurance Modal */}
      <InsuranceModal
        isOpen={showInsuranceModal}
        onClose={() => {
          setShowInsuranceModal(false);
          setEditingItem(null);
        }}
        editingId={editingItem}
        onSave={() => {
          loadData();
          setShowInsuranceModal(false);
          setEditingItem(null);
        }}
      />

      {/* Superannuation Modal */}
      <SuperModal
        isOpen={showSuperModal}
        onClose={() => {
          setShowSuperModal(false);
          setEditingItem(null);
        }}
        editingId={editingItem}
        onSave={() => {
          loadData();
          setShowSuperModal(false);
          setEditingItem(null);
        }}
      />

      {/* Misc Modal */}
      <MiscModal
        isOpen={showMiscModal}
        onClose={() => {
          setShowMiscModal(false);
          setEditingItem(null);
        }}
        editingId={editingItem}
        onSave={() => {
          loadData();
          setShowMiscModal(false);
          setEditingItem(null);
        }}
      />

      {/* Income Modal */}
      <IncomeModal
        isOpen={showIncomeModal}
        onClose={() => {
          setShowIncomeModal(false);
          setEditingItem(null);
        }}
        editingId={editingItem}
        onSave={() => {
          loadData();
          setShowIncomeModal(false);
          setEditingItem(null);
        }}
      />

      {/* Debt Modal */}
      <DebtModal
        isOpen={showDebtModal}
        onClose={() => {
          setShowDebtModal(false);
          setEditingItem(null);
        }}
        editingId={editingItem}
        onSave={() => {
          loadData();
          setShowDebtModal(false);
          setEditingItem(null);
        }}
      />

      <BottomNav />
    </div>
  );
};

// Empty State Component
const EmptyState = ({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) => (
  <div className="text-center py-12">
    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
      <Icon className="w-6 h-6 text-muted-foreground" />
    </div>
    <p className="font-medium mb-1">{title}</p>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

// Simple Card (income, debts)
const SimpleCard = ({
  title,
  badge,
  amountLabel,
  notes,
  linkedDocumentId,
  onEdit,
  onDelete,
}: {
  title: string;
  badge?: string;
  amountLabel: string;
  notes?: string;
  linkedDocumentId?: string;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const linkedDoc = linkedDocumentId ? DocumentService.getById(linkedDocumentId) : undefined;
  return (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex justify-between items-start mb-2">
      <div>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 inline-block">
            {badge}
          </span>
        )}
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{amountLabel}</p>
      </div>
      <div className="flex gap-1">
        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-muted">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-muted text-destructive">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
    {linkedDoc && (
      <Link
        to="/documents"
        className="inline-flex items-center gap-1 mt-2 text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1 hover:bg-muted transition-colors"
      >
        <ExternalLink className="w-3 h-3" /> Linked to {linkedDoc.title}
      </Link>
    )}
    {notes && <p className="text-sm text-muted-foreground mt-2">{notes}</p>}
  </div>
  );
};

// Insurance Card
const InsuranceCard = ({ 
  entry, 
  onEdit, 
  onDelete 
}: { 
  entry: InsuranceEntry; 
  onEdit: () => void; 
  onDelete: () => void;
}) => {
  const linkedBill = entry.linkedBillId ? BillService.getBillById(entry.linkedBillId) : undefined;
  const linkedDoc = entry.linkedDocumentId ? DocumentService.getById(entry.linkedDocumentId) : undefined;

  const frequencyLabel = (freq?: string) => {
    switch (freq) {
      case 'monthly': return '/mo';
      case 'quarterly': return '/qtr';
      case 'annual':
      case 'yearly': return '/yr';
      default: return '';
    }
  };

  const premiumText = () => {
    if (linkedBill) {
      return linkedBill.amount !== undefined
        ? `${formatCurrency(linkedBill.amount)}${frequencyLabel(linkedBill.recurringInterval)}`
        : null;
    }
    if (entry.premium === undefined) return null;
    return `${formatCurrency(entry.premium)}${frequencyLabel(entry.premiumFrequency)}`;
  };

  const amount = premiumText();

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 inline-block">
            {INSURANCE_TYPE_LABELS[entry.type]}
          </span>
          <h3 className="font-semibold">{entry.provider}</h3>
          {entry.policyNumber && (
            <p className="text-sm text-muted-foreground">Policy: {entry.policyNumber}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border mt-2">
        {amount ? (
          <span className="text-lg font-bold text-primary">{amount}</span>
        ) : entry.contactInfo ? (
          <span className="text-sm">
            <span className="text-muted-foreground">Who to contact: </span>
            {entry.contactInfo}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">No premium recorded</span>
        )}
        {entry.renewalDate && (
          <span className="text-sm text-muted-foreground shrink-0">
            Renews: {format(parseISO(entry.renewalDate), 'dd MMM yyyy')}
          </span>
        )}
      </div>

      {linkedBill && (
        <Link
          to="/bills"
          className="inline-flex items-center gap-1 mt-2 text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1 hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Linked to {linkedBill.name}
        </Link>
      )}

      {linkedDoc && (
        <Link
          to="/documents"
          className="inline-flex items-center gap-1 mt-2 text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1 hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Linked to {linkedDoc.title}
        </Link>
      )}

      {amount && entry.contactInfo && (
        <p className="text-sm text-muted-foreground mt-2">Who to contact: {entry.contactInfo}</p>
      )}

      {entry.notes && (
        <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
          {entry.notes}
        </p>
      )}
    </div>
  );
};

// Superannuation Card
const SuperCard = ({ 
  entry, 
  onEdit, 
  onDelete 
}: { 
  entry: SuperannuationEntry; 
  onEdit: () => void; 
  onDelete: () => void;
}) => {
  const linkedDoc = entry.linkedDocumentId ? DocumentService.getById(entry.linkedDocumentId) : undefined;
  const linkedAccount = entry.linkedBankAccountId ? BankAccountService.getById(entry.linkedBankAccountId) : undefined;
  return (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex justify-between items-start">
      <div>
        {entry.accountType && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 inline-block">
            {ACCOUNT_TYPE_LABELS[entry.accountType]}
          </span>
        )}
        <h3 className="font-semibold">{entry.fundName}</h3>
        {entry.accountNumber && (
          <p className="text-sm text-muted-foreground">Account: {entry.accountNumber}</p>
        )}
        <p className="text-lg font-bold text-primary mt-2">{formatCurrency(entry.estimatedBalance)}</p>
        {entry.contactInfo && (
          <p className="text-sm text-muted-foreground mt-1">Who to contact: {entry.contactInfo}</p>
        )}
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
    {linkedAccount && (
      <span className="inline-flex items-center gap-1 mt-2 text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1">
        <Landmark className="w-3 h-3" /> Linked to {linkedAccount.nickname}
      </span>
    )}
    {linkedDoc && (
      <Link
        to="/documents"
        className="inline-flex items-center gap-1 mt-2 text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1 hover:bg-muted transition-colors"
      >
        <ExternalLink className="w-3 h-3" /> Linked to {linkedDoc.title}
      </Link>
    )}
    {entry.notes && (
      <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
        {entry.notes}
      </p>
    )}
  </div>
  );
};

// Misc Card
const MiscCard = ({ 
  entry, 
  onEdit, 
  onDelete 
}: { 
  entry: MiscFinancialEntry; 
  onEdit: () => void; 
  onDelete: () => void;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="font-semibold">{entry.key}</h3>
        <p className="text-muted-foreground">{entry.value}</p>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
    {entry.notes && (
      <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
        {entry.notes}
      </p>
    )}
  </div>
);

// Insurance Modal
const InsuranceModal = ({ 
  isOpen, 
  onClose, 
  editingId, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  editingId: string | null;
  onSave: () => void;
}) => {
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [type, setType] = useState<InsuranceType>('auto');
  const [premium, setPremium] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [renewalDate, setRenewalDate] = useState('');
  const [notes, setNotes] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [linkedBill, setLinkedBill] = useState<LinkPickerOption | null>(null);
  const [linkedDocument, setLinkedDocument] = useState<LinkPickerOption | null>(null);

  const billOptions = useMemo(
    () => BillService.getAllBills().map((b) => ({ id: b.id, label: b.name })),
    [isOpen]
  );

  const documentOptions = useMemo(
    () => DocumentService.getAll().map((d) => ({ id: d.id, label: d.title })),
    [isOpen]
  );

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getInsurance().find(i => i.id === editingId);
      if (entry) {
        setProvider(entry.provider);
        setPolicyNumber(entry.policyNumber || '');
        setType(entry.type);
        setPremium(entry.premium !== undefined ? entry.premium.toString() : '');
        setFrequency(entry.premiumFrequency || 'monthly');
        setRenewalDate(entry.renewalDate || '');
        setNotes(entry.notes || '');
        setContactInfo(entry.contactInfo || '');
        const bill = entry.linkedBillId ? BillService.getBillById(entry.linkedBillId) : undefined;
        setLinkedBill(bill ? { id: bill.id, label: bill.name } : null);
        const doc = entry.linkedDocumentId ? DocumentService.getById(entry.linkedDocumentId) : undefined;
        setLinkedDocument(doc ? { id: doc.id, label: doc.title } : null);
      }
    } else {
      setProvider('');
      setPolicyNumber('');
      setType('auto');
      setPremium('');
      setFrequency('monthly');
      setRenewalDate('');
      setNotes('');
      setContactInfo('');
      setLinkedBill(null);
      setLinkedDocument(null);
    }
  }, [editingId, isOpen]);

  const handleSave = async () => {
    if (!provider) return;

    const data = {
      provider,
      policyNumber: policyNumber || undefined,
      type,
      premium: linkedBill || premium === '' ? undefined : parseFloat(premium),
      premiumFrequency: linkedBill || premium === '' ? undefined : frequency,
      renewalDate: renewalDate || undefined,
      notes: notes || undefined,
      contactInfo: contactInfo || undefined,
      linkedBillId: linkedBill?.id,
      linkedDocumentId: linkedDocument?.id,
    };

    if (editingId) {
      await FinancialInfoService.updateInsurance(editingId, data);
    } else {
      await FinancialInfoService.addInsurance(data);
      const msg = MilestoneService.recordMilestone('financial');
      if (msg) showMilestoneToast(msg);
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit' : 'Add'} Insurance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Provider</Label>
            <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Insurance company" />
          </div>
          <div>
            <Label>Policy Number (optional)</Label>
            <Input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} placeholder="POL-123456" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as InsuranceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INSURANCE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Linked bill (optional)</Label>
            <LinkPicker
              triggerLabel="Link to an existing bill"
              emptyLabel="No bills yet — type a name to create one"
              createLabel={(q) => `Create bill: ${q}`}
              options={billOptions}
              value={linkedBill}
              onChange={setLinkedBill}
              onCreate={async (name) => {
                const created = await BillService.addBill({ name, isRecurring: false });
                return { id: created.id, label: created.name };
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              If the premium is already tracked as a bill, link it instead of typing it twice.
            </p>
          </div>

          {linkedBill ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {(() => {
                const bill = BillService.getBillById(linkedBill.id);
                if (!bill) return <span className="text-muted-foreground">Bill not found</span>;
                return (
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {bill.amount !== undefined ? formatCurrency(bill.amount) : 'No amount'}
                      {bill.recurringInterval ? ` · ${bill.recurringInterval.replace('_', ' ')}` : ''}
                    </span>
                    <Link to="/bills" className="text-xs inline-flex items-center gap-1 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Open bill
                    </Link>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Premium (optional)</Label>
                <Input type="number" value={premium} onChange={(e) => setPremium(e.target.value)} placeholder="$0" />
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div>
            <Label>Renewal Date (optional)</Label>
            <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
          </div>
          <div>
            <Label>Who to contact (optional)</Label>
            <Input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="e.g. employer benefits line, 1800-xxx-xxx"
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Jewelry is covered under Home Insurance, plus a separate rider for the wedding ring."
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Linked document (optional)</Label>
            <LinkPicker
              triggerLabel="Link to an existing document"
              emptyLabel="No documents yet"
              options={documentOptions}
              value={linkedDocument}
              onChange={setLinkedDocument}
            />
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Superannuation Modal
const SuperModal = ({ 
  isOpen, 
  onClose, 
  editingId, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  editingId: string | null;
  onSave: () => void;
}) => {
  const [fundName, setFundName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<AccountType | ''>('');
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [linkedDocument, setLinkedDocument] = useState<LinkPickerOption | null>(null);
  const [linkedBankAccountId, setLinkedBankAccountId] = useState<string | undefined>(undefined);

  const documentOptions = useMemo(
    () => DocumentService.getAll().map((d) => ({ id: d.id, label: d.title })),
    [isOpen]
  );

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getSuperannuation().find(s => s.id === editingId);
      if (entry) {
        setFundName(entry.fundName);
        setAccountNumber(entry.accountNumber || '');
        setAccountType(entry.accountType || '');
        setBalance(entry.estimatedBalance.toString());
        setNotes(entry.notes || '');
        setContactInfo(entry.contactInfo || '');
        const doc = entry.linkedDocumentId ? DocumentService.getById(entry.linkedDocumentId) : undefined;
        setLinkedDocument(doc ? { id: doc.id, label: doc.title } : null);
        setLinkedBankAccountId(entry.linkedBankAccountId || undefined);
      }
    } else {
      setFundName('');
      setAccountNumber('');
      setAccountType('');
      setBalance('');
      setNotes('');
      setContactInfo('');
      setLinkedDocument(null);
      setLinkedBankAccountId(undefined);
    }
  }, [editingId, isOpen]);

  const handleSave = async () => {
    if (!fundName || !balance) return;

    const data = {
      fundName,
      accountNumber: accountNumber || undefined,
      accountType: accountType || undefined,
      estimatedBalance: parseFloat(balance),
      notes: notes || undefined,
      contactInfo: contactInfo || undefined,
      linkedDocumentId: linkedDocument?.id,
      linkedBankAccountId,
    };

    if (editingId) {
      await FinancialInfoService.updateSuperannuation(editingId, data);
    } else {
      await FinancialInfoService.addSuperannuation(data);
      const msg = MilestoneService.recordMilestone('financial');
      if (msg) showMilestoneToast(msg);
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit' : 'Add'} Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Fund Name</Label>
            <Input value={fundName} onChange={(e) => setFundName(e.target.value)} placeholder="Australian Super" />
          </div>
          <div>
            <Label>Type (optional)</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Account Number (optional)</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="12345678" />
          </div>
          <div>
            <Label className="mb-1.5 block">Linked bank account (optional)</Label>
            <BankAccountPicker value={linkedBankAccountId} onChange={setLinkedBankAccountId} />
            <p className="text-xs text-muted-foreground mt-1">
              If bills are already paid from this account, link it here so they stay in sync.
            </p>
          </div>
          <div>
            <Label>Estimated Balance</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="$0" />
          </div>
          <div>
            <Label>Who to contact (optional)</Label>
            <Input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="e.g. fund administrator, 1800-xxx-xxx"
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." />
          </div>
          <div>
            <Label className="mb-1.5 block">Linked document (optional)</Label>
            <LinkPicker
              triggerLabel="Link to an existing document"
              emptyLabel="No documents yet"
              options={documentOptions}
              value={linkedDocument}
              onChange={setLinkedDocument}
            />
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Misc Modal
const MiscModal = ({ 
  isOpen, 
  onClose, 
  editingId, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  editingId: string | null;
  onSave: () => void;
}) => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [linkedDocument, setLinkedDocument] = useState<LinkPickerOption | null>(null);

  const documentOptions = useMemo(
    () => DocumentService.getAll().map((d) => ({ id: d.id, label: d.title })),
    [isOpen]
  );

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getMisc().find(m => m.id === editingId);
      if (entry) {
        setKey(entry.key);
        setValue(entry.value);
        setNotes(entry.notes || '');
        const doc = entry.linkedDocumentId ? DocumentService.getById(entry.linkedDocumentId) : undefined;
        setLinkedDocument(doc ? { id: doc.id, label: doc.title } : null);
      }
    } else {
      setKey('');
      setValue('');
      setNotes('');
      setLinkedDocument(null);
    }
  }, [editingId, isOpen]);

  const handleSave = async () => {
    if (!key || !value) return;
    
    const data = {
      key,
      value,
      notes: notes || undefined,
      linkedDocumentId: linkedDocument?.id,
    };

    if (editingId) {
      await FinancialInfoService.updateMisc(editingId, data);
    } else {
      await FinancialInfoService.addMisc(data);
      const msg = MilestoneService.recordMilestone('financial');
      if (msg) showMilestoneToast(msg);
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit' : 'Add'} Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g., Storage unit access code" />
          </div>
          <div>
            <Label>Value</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter value" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." />
          </div>
          <div>
            <Label className="mb-1.5 block">Linked document (optional)</Label>
            <LinkPicker
              triggerLabel="Link to an existing document"
              emptyLabel="No documents yet"
              options={documentOptions}
              value={linkedDocument}
              onChange={setLinkedDocument}
            />
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Income Modal
const IncomeModal = ({
  isOpen,
  onClose,
  editingId,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingId: string | null;
  onSave: () => void;
}) => {
  const [sourceName, setSourceName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [linkedDocument, setLinkedDocument] = useState<LinkPickerOption | null>(null);
  const [linkedBankAccountId, setLinkedBankAccountId] = useState<string | undefined>(undefined);

  const documentOptions = useMemo(
    () => DocumentService.getAll().map((d) => ({ id: d.id, label: d.title })),
    [isOpen]
  );

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getIncome().find(i => i.id === editingId);
      if (entry) {
        setSourceName(entry.sourceName);
        setAmount(entry.approximateAmount.toString());
        setNotes(entry.notes || '');
        const doc = entry.linkedDocumentId ? DocumentService.getById(entry.linkedDocumentId) : undefined;
        setLinkedDocument(doc ? { id: doc.id, label: doc.title } : null);
        setLinkedBankAccountId(entry.linkedBankAccountId || undefined);
      }
    } else {
      setSourceName('');
      setAmount('');
      setNotes('');
      setLinkedDocument(null);
      setLinkedBankAccountId(undefined);
    }
  }, [editingId, isOpen]);

  const handleSave = async () => {
    if (!sourceName || !amount) return;
    const data = {
      sourceName,
      approximateAmount: parseFloat(amount),
      notes: notes || undefined,
      linkedDocumentId: linkedDocument?.id,
      linkedBankAccountId,
    };
    if (editingId) {
      await FinancialInfoService.updateIncome(editingId, data);
    } else {
      await FinancialInfoService.addIncome(data);
      const msg = MilestoneService.recordMilestone('financial');
      if (msg) showMilestoneToast(msg);
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit' : 'Add'} Income Source</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Source Name</Label>
            <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Primary salary" />
          </div>
          <div>
            <Label>Approximate Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$0" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. W-2, direct deposit to joint account" />
          </div>
          <div>
            <Label className="mb-1.5 block">Goes into (optional)</Label>
            <BankAccountPicker value={linkedBankAccountId} onChange={setLinkedBankAccountId} />
            <p className="text-xs text-muted-foreground mt-1">
              Which account this income is deposited into, if you've already added one.
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block">Linked document (optional)</Label>
            <LinkPicker
              triggerLabel="Link to an existing document"
              emptyLabel="No documents yet"
              options={documentOptions}
              value={linkedDocument}
              onChange={setLinkedDocument}
            />
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Debt Modal
const DebtModal = ({
  isOpen,
  onClose,
  editingId,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingId: string | null;
  onSave: () => void;
}) => {
  const [owedTo, setOwedTo] = useState('');
  const [type, setType] = useState<DebtType>('mortgage');
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [linkedDocument, setLinkedDocument] = useState<LinkPickerOption | null>(null);
  const [linkedBankAccountId, setLinkedBankAccountId] = useState<string | undefined>(undefined);
  const [linkedPaymentCardId, setLinkedPaymentCardId] = useState<string | undefined>(undefined);
  const [accountNumber, setAccountNumber] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  const documentOptions = useMemo(
    () => DocumentService.getAll().map((d) => ({ id: d.id, label: d.title })),
    [isOpen]
  );

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getDebts().find(d => d.id === editingId);
      if (entry) {
        setOwedTo(entry.owedTo);
        setType(entry.type);
        setBalance(entry.approximateBalance.toString());
        setNotes(entry.notes || '');
        const doc = entry.linkedDocumentId ? DocumentService.getById(entry.linkedDocumentId) : undefined;
        setLinkedDocument(doc ? { id: doc.id, label: doc.title } : null);
        setLinkedBankAccountId(entry.linkedBankAccountId || undefined);
        setLinkedPaymentCardId(entry.linkedPaymentCardId || undefined);
        setAccountNumber(entry.accountNumber || '');
        setContactInfo(entry.contactInfo || '');
      }
    } else {
      setOwedTo('');
      setType('mortgage');
      setBalance('');
      setNotes('');
      setLinkedDocument(null);
      setLinkedBankAccountId(undefined);
      setLinkedPaymentCardId(undefined);
      setAccountNumber('');
      setContactInfo('');
    }
  }, [editingId, isOpen]);

  const handleSave = async () => {
    if (!owedTo || !balance) return;
    const data = {
      owedTo,
      type,
      approximateBalance: parseFloat(balance),
      notes: notes || undefined,
      linkedDocumentId: linkedDocument?.id,
      linkedBankAccountId,
      linkedPaymentCardId: type === 'credit_card' ? linkedPaymentCardId : undefined,
      accountNumber: accountNumber || undefined,
      contactInfo: contactInfo || undefined,
    };
    if (editingId) {
      await FinancialInfoService.updateDebt(editingId, data);
    } else {
      await FinancialInfoService.addDebt(data);
      const msg = MilestoneService.recordMilestone('financial');
      if (msg) showMilestoneToast(msg);
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit' : 'Add'} Debt or Loan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Owed to</Label>
            <Input value={owedTo} onChange={(e) => setOwedTo(e.target.value)} placeholder="e.g. Commonwealth Bank, or a family member" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DebtType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEBT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Approximate Balance</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="$0" />
          </div>
          <div>
            <Label>Account number (optional)</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g. last 4 digits or reference number" />
          </div>
          <div>
            <Label>Who to contact (optional)</Label>
            <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="e.g. lender phone, online portal" />
          </div>
          {type === 'credit_card' ? (
            <div>
              <Label className="mb-1.5 block">Linked card (optional)</Label>
              <CardPicker value={linkedPaymentCardId} onChange={setLinkedPaymentCardId} />
            </div>
          ) : (
            <div>
              <Label className="mb-1.5 block">Paid from (optional)</Label>
              <BankAccountPicker value={linkedBankAccountId} onChange={setLinkedBankAccountId} />
              <p className="text-xs text-muted-foreground mt-1">
                If bills are already paid from this account, link it here so they stay in sync.
              </p>
            </div>
          )}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. refinanced 2024, autopay from checking" />
          </div>
          <div>
            <Label className="mb-1.5 block">Linked document (optional)</Label>
            <LinkPicker
              triggerLabel="Link to an existing document"
              emptyLabel="No documents yet"
              options={documentOptions}
              value={linkedDocument}
              onChange={setLinkedDocument}
            />
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FinancialInfo;
