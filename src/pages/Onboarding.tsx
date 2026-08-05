import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Chrome as Home, User, FileText, ChevronRight, Check, Shield, Eye, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OnboardingService } from '@/services/OnboardingService';
import { BillService } from '@/services/BillService';

type Step = 'hook' | 'quickstart' | 'add-item' | 'confirmation' | 'sharing' | 'family-preview';

const DRAFT_KEY = 'billvie_onboarding_draft';

interface BillDraft {
  billName: string;
  billAmount: string;
  billDueDate: string;
}

function loadDraft(): BillDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return { billName: '', billAmount: '', billDueDate: '' };
}

function saveDraft(draft: BillDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore write errors
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('hook');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Add bill form state
  const [billName, setBillName] = useState(() => loadDraft().billName);
  const [billAmount, setBillAmount] = useState(() => loadDraft().billAmount);
  const [billDueDate, setBillDueDate] = useState(() => loadDraft().billDueDate);
  const [addedItemName, setAddedItemName] = useState('');

  // Persist draft as the user types
  useEffect(() => {
    saveDraft({ billName, billAmount, billDueDate });
  }, [billName, billAmount, billDueDate]);

  const goTo = (next: Step) => setStep(next);

  const handleAddBill = async () => {
    if (!billName.trim()) return;
    await BillService.refresh();
    await BillService.addBill({
      name: billName.trim(),
      amount: billAmount ? parseFloat(billAmount) : undefined,
      dueDate: billDueDate || undefined,
      isRecurring: false,
    });
    setAddedItemName(billName.trim());
    clearDraft();
    OnboardingService.setState({ firstItemAdded: true });
    goTo('confirmation');
  };

  const handleAddPlaceholder = () => {
    setAddedItemName(selectedAction === 'contact' ? 'a key contact' : 'a document');
    OnboardingService.setState({ firstItemAdded: true });
    goTo('confirmation');
  };

  const finishOnboarding = () => {
    OnboardingService.complete();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {/* STEP 1: Hook */}
          {step === 'hook' && (
            <motion.div
              key="hook"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="text-center space-y-8"
            >
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Home className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground leading-tight">
                  If you weren't here tomorrow, would your family know what needs paying?
                </h1>
                <p className="text-muted-foreground text-base mt-4 leading-relaxed">
                  Most households rely on one person to keep everything running. Billvie makes sure the important stuff is visible — so your family is never left guessing.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => goTo('quickstart')}
                  className="btn-hero w-full text-base h-12"
                >
                  Let's make things clearer
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  onClick={finishOnboarding}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  I'll explore on my own
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Takes under 60 seconds. No financial credentials needed.
              </p>
            </motion.div>
          )}

          {/* STEP 2: Quick Start */}
          {step === 'quickstart' && (
            <motion.div
              key="quickstart"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Let's secure one important thing
                </h2>
                <p className="text-muted-foreground text-sm">
                  Pick the one that matters most right now. You can always add more later.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'bill',
                    icon: Home,
                    title: 'A household bill',
                    desc: 'So someone knows what keeps the lights on',
                  },
                  {
                    id: 'contact',
                    icon: User,
                    title: 'An important contact',
                    desc: 'A person your family might need to reach',
                  },
                  {
                    id: 'document',
                    icon: FileText,
                    title: 'A key document',
                    desc: 'Insurance, lease, or anything hard to find in a hurry',
                  },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedAction(option.id);
                      if (option.id === 'bill') {
                        goTo('add-item');
                      } else {
                        handleAddPlaceholder();
                      }
                    }}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left
                      ${selectedAction === option.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/40 bg-card'
                      }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <option.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{option.title}</p>
                      <p className="text-sm text-muted-foreground">{option.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => goTo('hook')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block mx-auto"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* STEP 3: Add Bill (simplified) */}
          {step === 'add-item' && (
            <motion.div
              key="add-item"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Add a household bill
                </h2>
                <p className="text-sm text-muted-foreground">
                  Just enough detail to be useful. This helps someone step in if needed.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-name">What is it? *</Label>
                  <Input
                    id="ob-name"
                    placeholder="e.g., Electricity, Internet, Council rates"
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    className="h-12"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ob-amount">
                      Amount <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="ob-amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                        className="h-12 pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ob-due">
                      Due date <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="ob-due"
                      type="date"
                      value={billDueDate}
                      onChange={(e) => setBillDueDate(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                We never store your login credentials or bank details
              </p>

              <div className="space-y-3">
                <Button
                  onClick={handleAddBill}
                  disabled={!billName.trim()}
                  className="btn-hero w-full text-base h-12"
                >
                  Save this bill
                </Button>
                <button
                  onClick={() => goTo('quickstart')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors block mx-auto"
                >
                  ← Back
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Confirmation */}
          {step === 'confirmation' && (
            <motion.div
              key="confirmation"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--status-paid))]/10 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-[hsl(var(--status-paid))]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  You've made your household easier to manage already
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {addedItemName ? (
                    <>
                      <span className="font-medium text-foreground">{addedItemName}</span> is now recorded. If someone needed to step in, they'd know about this.
                    </>
                  ) : (
                    "Your first item is saved. Someone could now step in and handle this."
                  )}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => goTo('sharing')}
                  className="btn-hero w-full text-base h-12"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBillName('');
                    setBillAmount('');
                    setBillDueDate('');
                    goTo('quickstart');
                  }}
                  className="w-full h-11"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add another item
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Sharing intro */}
          {step === 'sharing' && (
            <motion.div
              key="sharing"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Eye className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  You don't have to be the only one who knows
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Invite your partner, a family member, or someone you trust. They'll see what matters — nothing more, nothing less.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-xs text-muted-foreground text-left">
                    Only you control who sees what. We never share your information with anyone you haven't invited.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => goTo('family-preview')}
                  variant="outline"
                  className="w-full h-11 text-base"
                >
                  I'll do this later
                </Button>
                <Button
                  onClick={() => {
                    OnboardingService.setState({ sharingOffered: true });
                    goTo('family-preview');
                  }}
                  className="btn-hero w-full text-base h-12"
                >
                  Invite someone
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Family View Preview */}
          {step === 'family-preview' && (
            <motion.div
              key="family-preview"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  What your family would see
                </h2>
                <p className="text-sm text-muted-foreground">
                  This is what someone stepping in would find right now.
                </p>
              </div>

              {/* Mini preview card */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
                  <Eye className="w-3.5 h-3.5" />
                  Family View
                </div>

                {/* Added item */}
                {addedItemName && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--status-paid))]/5 border border-[hsl(var(--status-paid))]/20">
                    <Check className="w-4 h-4 text-[hsl(var(--status-paid))]" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{addedItemName}</p>
                      <p className="text-xs text-muted-foreground">Recorded</p>
                    </div>
                  </div>
                )}

                {/* Empty states */}
                {['Key contacts', 'Important documents', 'Other bills'].map((label) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed border-border">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Add more to make this even clearer for your family
              </p>

              <Button
                onClick={finishOnboarding}
                className="btn-hero w-full text-base h-12"
              >
                Go to your household overview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          {(['hook', 'quickstart', 'add-item', 'confirmation', 'sharing', 'family-preview'] as Step[]).map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all ${
                s === step ? 'bg-primary w-6' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
