import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Shield,
  Wallet,
  FileText,
  Trash2,
  Edit2,
  ExternalLink,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
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
  DEBT_TYPE_LABELS
} from '@/services/FinancialInfoService';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';

const FinancialInfo = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('insurance');
  
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setInsurance(FinancialInfoService.getInsurance());
    setSuperannuation(FinancialInfoService.getSuperannuation());
    setMisc(FinancialInfoService.getMisc());
    setIncome(FinancialInfoService.getIncome());
    setDebts(FinancialInfoService.getDebts());
  };

  const totalAnnualPremiums = FinancialInfoService.getTotalAnnualPremiums();
  const totalSuperBalance = FinancialInfoService.getTotalSuperBalance();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Financial Snapshot</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Insurance</span>
            </div>
            <p className="text-xl font-bold">${totalAnnualPremiums.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">/year total premiums</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Superannuation</span>
            </div>
            <p className="text-xl font-bold">${totalSuperBalance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">estimated balance</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 mb-6">
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="super">Super</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="debts">Debts</TabsTrigger>
            <TabsTrigger value="misc">Other</TabsTrigger>
          </TabsList>

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
                  onDelete={() => {
                    FinancialInfoService.deleteInsurance(entry.id);
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
                  onDelete={() => {
                    FinancialInfoService.deleteSuperannuation(entry.id);
                    loadData();
                  }}
                />
              ))}

              {superannuation.length === 0 && (
                <EmptyState 
                  icon={Wallet}
                  title="No superannuation funds"
                  description="Track your retirement savings"
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
                Add Superannuation
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
                  amountLabel={`$${entry.approximateAmount.toLocaleString()} approx.`}
                  notes={entry.notes}
                  onEdit={() => {
                    setEditingItem(entry.id);
                    setShowIncomeModal(true);
                  }}
                  onDelete={() => {
                    FinancialInfoService.deleteIncome(entry.id);
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
                  title={entry.lenderName}
                  badge={DEBT_TYPE_LABELS[entry.type]}
                  amountLabel={`$${entry.approximateBalance.toLocaleString()} approx. balance`}
                  notes={entry.notes}
                  onEdit={() => {
                    setEditingItem(entry.id);
                    setShowDebtModal(true);
                  }}
                  onDelete={() => {
                    FinancialInfoService.deleteDebt(entry.id);
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
                  onDelete={() => {
                    FinancialInfoService.deleteMisc(entry.id);
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
  onEdit,
  onDelete,
}: {
  title: string;
  badge?: string;
  amountLabel: string;
  notes?: string;
  onEdit: () => void;
  onDelete: () => void;
}) => (
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
    {notes && <p className="text-sm text-muted-foreground mt-2">{notes}</p>}
  </div>
);

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
  const premiumText = () => {
    switch (entry.premiumFrequency) {
      case 'monthly': return `$${entry.premium}/mo`;
      case 'quarterly': return `$${entry.premium}/qtr`;
      case 'annual': return `$${entry.premium}/yr`;
    }
  };

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
      
      <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
        <span className="text-lg font-bold text-primary">{premiumText()}</span>
        {entry.renewalDate && (
          <span className="text-sm text-muted-foreground">
            Renews: {format(parseISO(entry.renewalDate), 'dd MMM yyyy')}
          </span>
        )}
      </div>

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
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="font-semibold">{entry.fundName}</h3>
        {entry.accountNumber && (
          <p className="text-sm text-muted-foreground">Account: {entry.accountNumber}</p>
        )}
        <p className="text-lg font-bold text-primary mt-2">${entry.estimatedBalance.toLocaleString()}</p>
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

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getInsurance().find(i => i.id === editingId);
      if (entry) {
        setProvider(entry.provider);
        setPolicyNumber(entry.policyNumber || '');
        setType(entry.type);
        setPremium(entry.premium.toString());
        setFrequency(entry.premiumFrequency);
        setRenewalDate(entry.renewalDate || '');
        setNotes(entry.notes || '');
      }
    } else {
      setProvider('');
      setPolicyNumber('');
      setType('auto');
      setPremium('');
      setFrequency('monthly');
      setRenewalDate('');
      setNotes('');
    }
  }, [editingId, isOpen]);

  const handleSave = () => {
    if (!provider || !premium) return;
    
    const data = {
      provider,
      policyNumber: policyNumber || undefined,
      type,
      premium: parseFloat(premium),
      premiumFrequency: frequency,
      renewalDate: renewalDate || undefined,
      notes: notes || undefined,
    };

    if (editingId) {
      FinancialInfoService.updateInsurance(editingId, data);
    } else {
      FinancialInfoService.addInsurance(data);
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Premium</Label>
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
          <div>
            <Label>Renewal Date (optional)</Label>
            <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." />
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
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getSuperannuation().find(s => s.id === editingId);
      if (entry) {
        setFundName(entry.fundName);
        setAccountNumber(entry.accountNumber || '');
        setBalance(entry.estimatedBalance.toString());
        setNotes(entry.notes || '');
      }
    } else {
      setFundName('');
      setAccountNumber('');
      setBalance('');
      setNotes('');
    }
  }, [editingId, isOpen]);

  const handleSave = () => {
    if (!fundName || !balance) return;
    
    const data = {
      fundName,
      accountNumber: accountNumber || undefined,
      estimatedBalance: parseFloat(balance),
      notes: notes || undefined,
    };

    if (editingId) {
      FinancialInfoService.updateSuperannuation(editingId, data);
    } else {
      FinancialInfoService.addSuperannuation(data);
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit' : 'Add'} Superannuation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Fund Name</Label>
            <Input value={fundName} onChange={(e) => setFundName(e.target.value)} placeholder="Australian Super" />
          </div>
          <div>
            <Label>Account Number (optional)</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="12345678" />
          </div>
          <div>
            <Label>Estimated Balance</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="$0" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." />
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

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getMisc().find(m => m.id === editingId);
      if (entry) {
        setKey(entry.key);
        setValue(entry.value);
        setNotes(entry.notes || '');
      }
    } else {
      setKey('');
      setValue('');
      setNotes('');
    }
  }, [editingId, isOpen]);

  const handleSave = () => {
    if (!key || !value) return;
    
    const data = {
      key,
      value,
      notes: notes || undefined,
    };

    if (editingId) {
      FinancialInfoService.updateMisc(editingId, data);
    } else {
      FinancialInfoService.addMisc(data);
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
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g., Tax File Number" />
          </div>
          <div>
            <Label>Value</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter value" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." />
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

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getIncome().find(i => i.id === editingId);
      if (entry) {
        setSourceName(entry.sourceName);
        setAmount(entry.approximateAmount.toString());
        setNotes(entry.notes || '');
      }
    } else {
      setSourceName('');
      setAmount('');
      setNotes('');
    }
  }, [editingId, isOpen]);

  const handleSave = () => {
    if (!sourceName || !amount) return;
    const data = {
      sourceName,
      approximateAmount: parseFloat(amount),
      notes: notes || undefined,
    };
    if (editingId) {
      FinancialInfoService.updateIncome(editingId, data);
    } else {
      FinancialInfoService.addIncome(data);
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
  const [lenderName, setLenderName] = useState('');
  const [type, setType] = useState<DebtType>('mortgage');
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingId) {
      const entry = FinancialInfoService.getDebts().find(d => d.id === editingId);
      if (entry) {
        setLenderName(entry.lenderName);
        setType(entry.type);
        setBalance(entry.approximateBalance.toString());
        setNotes(entry.notes || '');
      }
    } else {
      setLenderName('');
      setType('mortgage');
      setBalance('');
      setNotes('');
    }
  }, [editingId, isOpen]);

  const handleSave = () => {
    if (!lenderName || !balance) return;
    const data = {
      lenderName,
      type,
      approximateBalance: parseFloat(balance),
      notes: notes || undefined,
    };
    if (editingId) {
      FinancialInfoService.updateDebt(editingId, data);
    } else {
      FinancialInfoService.addDebt(data);
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
            <Label>Lender Name</Label>
            <Input value={lenderName} onChange={(e) => setLenderName(e.target.value)} placeholder="Commonwealth Bank" />
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
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. refinanced 2024, autopay from checking" />
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FinancialInfo;
