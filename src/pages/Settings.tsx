import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Sun, 
  Moon, 
  Monitor, 
  User, 
  CreditCard, 
  Trash2, 
  LogOut,
  Bell,
  Download,
  ChevronRight,
  Check,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UserService } from '@/services/UserService';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { LoanReadyService } from '@/services/LoanReadyService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { UserSettings } from '@/types/bill';
import BottomNav from '@/components/BottomNav';
import UpgradeModal from '@/components/UpgradeModal';
import ActiveSharesSection from '@/components/sharing/ActiveSharesSection';
import { cn } from '@/lib/utils';

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings>(UserService.getSettings());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    // Apply theme on mount
    UserService.applyTheme(settings.theme);
  }, [settings.theme]);

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    const updated = UserService.saveSettings({ theme });
    setSettings(updated);
  };

  const handleClearSampleData = () => {
    BillService.clearSampleBills();
    EventService.clearSampleEvents();
    // Refresh to show changes
    window.location.reload();
  };

  const handleClearAllData = () => {
    if (confirm('This will delete ALL your data including bills, events, and financial info. Are you sure?')) {
      UserService.clearAllData();
      EventService.clearAllEvents();
      LoanReadyService.clearAll();
      FinancialInfoService.clearAll();
      window.location.href = '/';
    }
  };

  const handleUpgrade = () => {
    // Mock upgrade
    const updated = UserService.saveSettings({ userType: 'paid', hasEventsAccess: true });
    setSettings(updated);
    setShowUpgradeModal(false);
  };

  const sampleBillCount = BillService.getAllBills().filter(b => b.isSample).length;
  const sampleEventCount = EventService.getAllEvents().filter(e => e.isSample).length;
  const hasSampleData = sampleBillCount > 0 || sampleEventCount > 0;
  const isPaid = settings.userType === 'paid' || settings.userType === 'accountant';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Account Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Account</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Sign In / Create Account</p>
                <p className="text-sm text-muted-foreground">Sync data across devices</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Active Shares Section - Only for paid users */}
        {isPaid && (
          <ActiveSharesSection />
        )}

        {/* Subscription Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Subscription</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {isPaid ? 'Paid - $5/month' : 'Free'}
                  </p>
                </div>
              </div>
              {isPaid ? (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  Active
                </span>
              ) : (
                <Button size="sm" onClick={() => setShowUpgradeModal(true)}>
                  Upgrade
                </Button>
              )}
            </div>
            
            {!isPaid && (
              <div className="p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">
                  Free plan limits:
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• 25 bills maximum</li>
                  <li>• 3 events maximum</li>
                  <li>• No sharing or export</li>
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Appearance Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Appearance</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4">
              <p className="font-medium mb-4">Theme</p>
              <div className="flex gap-2">
                {[
                  { value: 'light', icon: Sun, label: 'Light' },
                  { value: 'dark', icon: Moon, label: 'Dark' },
                  { value: 'system', icon: Monitor, label: 'System' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => handleThemeChange(value as 'light' | 'dark' | 'system')}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors',
                      settings.theme === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <Icon className={cn(
                      'w-5 h-5',
                      settings.theme === value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className={cn(
                      'text-xs',
                      settings.theme === value ? 'text-primary font-medium' : 'text-muted-foreground'
                    )}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Notifications</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="notifications" className="font-medium">Bill Reminders</Label>
                  <p className="text-sm text-muted-foreground">Notify 3 days before due</p>
                </div>
              </div>
              <Switch id="notifications" />
            </div>
          </div>
        </section>

        {/* Data Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Data</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Export */}
            <button 
              onClick={() => isPaid ? null : setShowUpgradeModal(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Export All Data</p>
                <p className="text-sm text-muted-foreground">Download as JSON or CSV</p>
              </div>
              {!isPaid ? (
                <Lock className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {/* Clear Sample Data */}
            {hasSampleData && (
              <button 
                onClick={handleClearSampleData}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Clear Sample Data</p>
                  <p className="text-sm text-muted-foreground">
                    Remove {sampleBillCount} sample bills and {sampleEventCount} sample events
                  </p>
                </div>
              </button>
            )}

            {/* Clear All Data */}
            <button 
              onClick={handleClearAllData}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-destructive"
            >
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Delete All Data</p>
                <p className="text-sm opacity-70">This cannot be undone</p>
              </div>
            </button>
          </div>
        </section>

        {/* About Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">About</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono text-sm">1.0.0</span>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="general"
        onUpgrade={handleUpgrade}
        onPreviewAnyway={() => setShowUpgradeModal(false)}
      />
    </div>
  );
};

export default Settings;
