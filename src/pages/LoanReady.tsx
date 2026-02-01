import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Briefcase, 
  Home, 
  DollarSign, 
  Landmark,
  Trash2,
  Edit2,
  AlertCircle,
  Lock,
  Check,
  X,
  FileDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  LoanReadyService, 
  EmploymentEntry, 
  RentalEntry, 
  AssetEntry,
  IncomeData 
} from '@/services/LoanReadyService';
import { UserService } from '@/services/UserService';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';

const LoanReady = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('employment');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  
  // Data states
  const [employment, setEmployment] = useState<EmploymentEntry[]>([]);
  const [rental, setRental] = useState<RentalEntry[]>([]);
  const [assets, setAssets] = useState<AssetEntry[]>([]);
  const [income, setIncome] = useState<IncomeData | undefined>();
  
  // Modal states
  const [showEmploymentModal, setShowEmploymentModal] = useState(false);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  useEffect(() => {
    // Check if PIN is required
    if (!LoanReadyService.hasPin()) {
      setShowPinSetup(true);
    }
    loadData();
  }, []);

  const loadData = () => {
    setEmployment(LoanReadyService.getEmployment());
    setRental(LoanReadyService.getRental());
    setAssets(LoanReadyService.getAssets());
    setIncome(LoanReadyService.getIncome());
  };

  const handlePinVerify = () => {
    if (LoanReadyService.verifyPin(pinInput)) {
      setIsPinVerified(true);
      setPinInput('');
    } else {
      alert('Incorrect PIN');
    }
  };

  const handlePinSetup = () => {
    if (newPin.length === 4) {
      LoanReadyService.setPin(newPin);
      setShowPinSetup(false);
      setIsPinVerified(true);
      setNewPin('');
    }
  };

  const employmentSummary = LoanReadyService.getEmploymentSummary();
  const rentalSummary = LoanReadyService.getRentalSummary();
  const incomeFormatted = LoanReadyService.getIncomeFormatted();
  const totalAssets = LoanReadyService.getTotalAssetValue();

  // PIN verification screen
  if (LoanReadyService.hasPin() && !isPinVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">LoanReady Secured</h2>
          <p className="text-muted-foreground mb-6">Enter your 4-digit PIN to access</p>
          
          <Input
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="text-center text-2xl tracking-widest mb-4"
          />
          
          <Button onClick={handlePinVerify} className="w-full" disabled={pinInput.length !== 4}>
            Unlock
          </Button>
          
          <Button variant="ghost" onClick={() => navigate(-1)} className="w-full mt-2">
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  // PIN setup modal
  if (showPinSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Secure Your Data</h2>
          <p className="text-muted-foreground mb-6">
            LoanReady contains sensitive information. Set a 4-digit PIN to protect it.
          </p>
          
          <Input
            type="password"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter 4-digit PIN"
            className="text-center text-2xl tracking-widest mb-4"
          />
          
          <Button onClick={handlePinSetup} className="w-full" disabled={newPin.length !== 4}>
            Set PIN
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => {
              setShowPinSetup(false);
              setIsPinVerified(true);
            }} 
            className="w-full mt-2"
          >
            Skip for now
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">LoanReady</h1>
          </div>
          <Button variant="outline" size="sm">
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <SummaryCard
            icon={Briefcase}
            label="Employment"
            value={`${employmentSummary.years}y ${employmentSummary.months}m`}
            subtext={employmentSummary.gaps.length > 0 ? `${employmentSummary.gaps.length} gap(s)` : 'No gaps'}
            hasWarning={employmentSummary.gaps.length > 0}
          />
          <SummaryCard
            icon={Home}
            label="Rental History"
            value={`${rentalSummary.years}y ${rentalSummary.months}m`}
            subtext="Total renting"
          />
          <SummaryCard
            icon={DollarSign}
            label="Income"
            value={incomeFormatted ? `$${incomeFormatted.monthly.toLocaleString()}` : 'Not set'}
            subtext={incomeFormatted ? '/month' : 'Add income'}
          />
          <SummaryCard
            icon={Landmark}
            label="Total Assets"
            value={`$${totalAssets.toLocaleString()}`}
            subtext={`${assets.length} asset(s)`}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="employment">Jobs</TabsTrigger>
            <TabsTrigger value="rental">Rental</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
          </TabsList>

          {/* Employment Tab */}
          <TabsContent value="employment">
            <div className="space-y-4">
              {/* Gaps Warning */}
              {employmentSummary.gaps.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive mb-1">Employment Gaps Detected</p>
                      {employmentSummary.gaps.map((gap, i) => (
                        <p key={i} className="text-sm text-destructive/80">
                          {gap.months} month gap: {format(parseISO(gap.start), 'MMM yyyy')} - {format(parseISO(gap.end), 'MMM yyyy')}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {employment.map((entry) => (
                <EmploymentCard 
                  key={entry.id} 
                  entry={entry}
                  onEdit={() => {
                    setEditingItem(entry.id);
                    setShowEmploymentModal(true);
                  }}
                  onDelete={() => {
                    LoanReadyService.deleteEmployment(entry.id);
                    loadData();
                  }}
                />
              ))}

              {employment.length === 0 && (
                <EmptyState 
                  icon={Briefcase}
                  title="No employment history"
                  description="Add your work history for loan applications"
                />
              )}

              <Button 
                onClick={() => {
                  setEditingItem(null);
                  setShowEmploymentModal(true);
                }}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Employment
              </Button>
            </div>
          </TabsContent>

          {/* Rental Tab */}
          <TabsContent value="rental">
            <div className="space-y-4">
              {rental.map((entry) => (
                <RentalCard 
                  key={entry.id} 
                  entry={entry}
                  onEdit={() => {
                    setEditingItem(entry.id);
                    setShowRentalModal(true);
                  }}
                  onDelete={() => {
                    LoanReadyService.deleteRental(entry.id);
                    loadData();
                  }}
                />
              ))}

              {rental.length === 0 && (
                <EmptyState 
                  icon={Home}
                  title="No rental history"
                  description="Add your rental history for loan applications"
                />
              )}

              <Button 
                onClick={() => {
                  setEditingItem(null);
                  setShowRentalModal(true);
                }}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Rental
              </Button>
            </div>
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income">
            <div className="space-y-4">
              {income ? (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold">Current Income</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowIncomeModal(true)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly</p>
                      <p className="text-2xl font-bold">${incomeFormatted?.monthly.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Annual</p>
                      <p className="text-2xl font-bold">${incomeFormatted?.annual.toLocaleString()}</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {income.isPreTax ? 'Pre-tax (gross)' : 'Take-home (net)'}
                  </p>
                </div>
              ) : (
                <EmptyState 
                  icon={DollarSign}
                  title="No income set"
                  description="Add your income details"
                />
              )}

              <Button 
                onClick={() => setShowIncomeModal(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                {income ? 'Update Income' : 'Add Income'}
              </Button>
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets">
            <div className="space-y-4">
              {assets.map((asset) => (
                <AssetCard 
                  key={asset.id} 
                  asset={asset}
                  onEdit={() => {
                    setEditingItem(asset.id);
                    setShowAssetModal(true);
                  }}
                  onDelete={() => {
                    LoanReadyService.deleteAsset(asset.id);
                    loadData();
                  }}
                />
              ))}

              {assets.length === 0 && (
                <EmptyState 
                  icon={Landmark}
                  title="No assets listed"
                  description="Add your assets like property, vehicles, or savings"
                />
              )}

              <Button 
                onClick={() => {
                  setEditingItem(null);
                  setShowAssetModal(true);
                }}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Employment Modal */}
      <EmploymentModal
        isOpen={showEmploymentModal}
        onClose={() => {
          setShowEmploymentModal(false);
          setEditingItem(null);
        }}
        editingId={editingItem}
        onSave={() => {
          loadData();
          setShowEmploymentModal(false);
          setEditingItem(null);
        }}
      />

      {/* Rental Modal */}
      <RentalModal
        isOpen={showRentalModal}
        onClose={() => {
          setShowRentalModal(false);
          setEditingItem(null);
        }}
        editingId={editingItem}
        onSave={() => {
          loadData();
          setShowRentalModal(false);
          setEditingItem(null);
        }}
      />

      {/* Asset Modal */}
      <AssetModal
        isOpen={showAssetModal}
        onClose={() => {
          setShowAssetModal(false);
          setEditingItem(null);
        }}
        editingId={editingItem}
        onSave={() => {
          loadData();
          setShowAssetModal(false);
          setEditingItem(null);
        }}
      />

      {/* Income Modal */}
      <IncomeModal
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        currentIncome={income}
        onSave={() => {
          loadData();
          setShowIncomeModal(false);
        }}
      />

      <BottomNav />
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  hasWarning 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  subtext: string;
  hasWarning?: boolean;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={cn('w-4 h-4', hasWarning ? 'text-destructive' : 'text-primary')} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <p className="text-xl font-bold">{value}</p>
    <p className={cn('text-xs', hasWarning ? 'text-destructive' : 'text-muted-foreground')}>
      {subtext}
    </p>
  </div>
);

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

// Employment Card
const EmploymentCard = ({ 
  entry, 
  onEdit, 
  onDelete 
}: { 
  entry: EmploymentEntry; 
  onEdit: () => void; 
  onDelete: () => void;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex justify-between items-start mb-2">
      <div>
        <h3 className="font-semibold">{entry.position}</h3>
        <p className="text-sm text-muted-foreground">{entry.company}</p>
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
    <div className="flex items-center gap-2 text-sm">
      <span>{format(parseISO(entry.startDate), 'MMM yyyy')}</span>
      <span>-</span>
      <span>{entry.isCurrent ? 'Present' : format(parseISO(entry.endDate!), 'MMM yyyy')}</span>
      {entry.isCurrent && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Current</span>
      )}
    </div>
  </div>
);

// Rental Card
const RentalCard = ({ 
  entry, 
  onEdit, 
  onDelete 
}: { 
  entry: RentalEntry; 
  onEdit: () => void; 
  onDelete: () => void;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex justify-between items-start mb-2">
      <div>
        <h3 className="font-semibold">{entry.address}</h3>
        {entry.landlord && <p className="text-sm text-muted-foreground">Landlord: {entry.landlord}</p>}
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
    <div className="flex items-center gap-2 text-sm">
      <span>{format(parseISO(entry.startDate), 'MMM yyyy')}</span>
      <span>-</span>
      <span>{entry.isCurrent ? 'Present' : format(parseISO(entry.endDate!), 'MMM yyyy')}</span>
      {entry.isCurrent && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Current</span>
      )}
    </div>
  </div>
);

// Asset Card
const ASSET_TYPE_LABELS = {
  property: 'Property',
  vehicle: 'Vehicle',
  savings: 'Savings',
  investment: 'Investment',
  other: 'Other',
};

const AssetCard = ({ 
  asset, 
  onEdit, 
  onDelete 
}: { 
  asset: AssetEntry; 
  onEdit: () => void; 
  onDelete: () => void;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex justify-between items-start">
      <div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground mb-2 inline-block">
          {ASSET_TYPE_LABELS[asset.type]}
        </span>
        <h3 className="font-semibold">{asset.description}</h3>
        <p className="text-lg font-bold text-primary">${asset.estimatedValue.toLocaleString()}</p>
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
  </div>
);

// Employment Modal
const EmploymentModal = ({ 
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
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    if (editingId) {
      const entry = LoanReadyService.getEmployment().find(e => e.id === editingId);
      if (entry) {
        setCompany(entry.company);
        setPosition(entry.position);
        setStartDate(entry.startDate);
        setEndDate(entry.endDate || '');
        setIsCurrent(entry.isCurrent);
      }
    } else {
      setCompany('');
      setPosition('');
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
    }
  }, [editingId, isOpen]);

  const handleSave = () => {
    if (!company || !position || !startDate) return;
    
    if (editingId) {
      LoanReadyService.updateEmployment(editingId, {
        company,
        position,
        startDate,
        endDate: isCurrent ? undefined : endDate,
        isCurrent,
      });
    } else {
      LoanReadyService.addEmployment({
        company,
        position,
        startDate,
        endDate: isCurrent ? undefined : endDate,
        isCurrent,
      });
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit' : 'Add'} Employment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <Label>Position</Label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Job title" />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isCurrent} onCheckedChange={setIsCurrent} />
            <Label>I currently work here</Label>
          </div>
          {!isCurrent && (
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Rental Modal
const RentalModal = ({ 
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
  const [address, setAddress] = useState('');
  const [landlord, setLandlord] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    if (editingId) {
      const entry = LoanReadyService.getRental().find(e => e.id === editingId);
      if (entry) {
        setAddress(entry.address);
        setLandlord(entry.landlord || '');
        setStartDate(entry.startDate);
        setEndDate(entry.endDate || '');
        setIsCurrent(entry.isCurrent);
      }
    } else {
      setAddress('');
      setLandlord('');
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
    }
  }, [editingId, isOpen]);

  const handleSave = () => {
    if (!address || !startDate) return;
    
    if (editingId) {
      LoanReadyService.updateRental(editingId, {
        address,
        landlord: landlord || undefined,
        startDate,
        endDate: isCurrent ? undefined : endDate,
        isCurrent,
      });
    } else {
      LoanReadyService.addRental({
        address,
        landlord: landlord || undefined,
        startDate,
        endDate: isCurrent ? undefined : endDate,
        isCurrent,
      });
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit' : 'Add'} Rental</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
          </div>
          <div>
            <Label>Landlord (optional)</Label>
            <Input value={landlord} onChange={(e) => setLandlord(e.target.value)} placeholder="Landlord name" />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isCurrent} onCheckedChange={setIsCurrent} />
            <Label>I currently live here</Label>
          </div>
          {!isCurrent && (
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Asset Modal
const AssetModal = ({ 
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
  const [type, setType] = useState<AssetEntry['type']>('savings');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (editingId) {
      const asset = LoanReadyService.getAssets().find(a => a.id === editingId);
      if (asset) {
        setType(asset.type);
        setDescription(asset.description);
        setValue(asset.estimatedValue.toString());
      }
    } else {
      setType('savings');
      setDescription('');
      setValue('');
    }
  }, [editingId, isOpen]);

  const handleSave = () => {
    if (!description || !value) return;
    
    if (editingId) {
      LoanReadyService.updateAsset(editingId, {
        type,
        description,
        estimatedValue: parseFloat(value),
      });
    } else {
      LoanReadyService.addAsset({
        type,
        description,
        estimatedValue: parseFloat(value),
      });
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit' : 'Add'} Asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssetEntry['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., 2020 Toyota Camry" />
          </div>
          <div>
            <Label>Estimated Value</Label>
            <Input 
              type="number" 
              value={value} 
              onChange={(e) => setValue(e.target.value)} 
              placeholder="$0" 
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
  currentIncome,
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentIncome?: IncomeData;
  onSave: () => void;
}) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'monthly' | 'annual'>('monthly');
  const [isPreTax, setIsPreTax] = useState(true);

  useEffect(() => {
    if (currentIncome) {
      setAmount(currentIncome.amount.toString());
      setType(currentIncome.type);
      setIsPreTax(currentIncome.isPreTax);
    } else {
      setAmount('');
      setType('monthly');
      setIsPreTax(true);
    }
  }, [currentIncome, isOpen]);

  const handleSave = () => {
    if (!amount) return;
    
    LoanReadyService.setIncome({
      amount: parseFloat(amount),
      type,
      isPreTax,
    });
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Income</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount</Label>
            <Input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="$0" 
            />
          </div>
          <div>
            <Label>Frequency</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'monthly' | 'annual')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isPreTax} onCheckedChange={setIsPreTax} />
            <Label>{isPreTax ? 'Pre-tax (gross)' : 'Take-home (net)'}</Label>
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanReady;
