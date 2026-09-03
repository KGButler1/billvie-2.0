import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sun, Moon, Monitor, User, CreditCard, Landmark, Trash2, LogOut, Bell, Download, FileText, FileSpreadsheet, ChevronRight, Check, Lock, Undo2, Camera, Loader as Loader2 } from 'lucide-react';
import { downloadBackup } from '@/utils/dataBackup';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UserService } from '@/services/UserService';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { UserSettings } from '@/types/bill';
import BottomNav from '@/components/BottomNav';
import UpgradeModal from '@/components/UpgradeModal';
import ManageCardsSheet from '@/components/cards/ManageCardsSheet';
import ManageBankAccountsSheet from '@/components/accounts/ManageBankAccountsSheet';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import UserAvatar, { getInitials } from '@/components/UserAvatar';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { PRO_PRICE, PRO_PERIOD, FREE_FEATURES } from '@/constants/pricing';

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings>(UserService.getSettings());
  const { profile, reload } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'general' | 'export'>('general');
  const [showCardsSheet, setShowCardsSheet] = useState(false);
  const [showBankAccountsSheet, setShowBankAccountsSheet] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const upgrade = searchParams.get('upgrade');
    if (upgrade === 'success') {
      toast.success('Upgrade complete! Your plan is now active.');
      reload();
      let attempts = 0;
      const retry = setInterval(() => {
        attempts++;
        reload();
        if (attempts >= 2) clearInterval(retry);
      }, 3000);
      setSearchParams({}, { replace: true });
    } else if (upgrade === 'canceled') {
      toast('Checkout canceled.');
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    // Apply theme on mount
    UserService.applyTheme(settings.theme);
  }, [settings.theme]);

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    const updated = UserService.saveSettings({ theme });
    setSettings(updated);
  };

  const handleClearSampleData = async () => {
    await Promise.all([
      BillService.clearSampleBills(),
      EventService.clearSampleEvents(),
    ]);
    window.location.reload();
  };

  const handleClearAllData = async () => {
    if (confirm('This will delete ALL your data including bills, events, and financial info. Are you sure?')) {
      UserService.clearAllData();
      await Promise.all([
        EventService.clearAllEvents(),
        FinancialInfoService.clearAll(),
        BillService.clearAllBills(),
      ]);
      window.location.href = '/';
    }
  };

  const sampleBillCount = BillService.getAllBills().filter(b => b.isSample).length;
  const sampleEventCount = EventService.getAllEvents().filter(e => e.isSample).length;
  const hasSampleData = sampleBillCount > 0 || sampleEventCount > 0;
  const isPaid = profile?.isPaid ?? false;

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: { return_url: `${window.location.origin}/settings` },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No portal URL returned');
    } catch {
      setPortalLoading(false);
      toast.error('Could not open subscription management. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Profile Section */}
        <ProfileSection />

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
                    {isPaid ? `Paid - ${PRO_PRICE}${PRO_PERIOD}` : 'Free'}
                  </p>
                </div>
              </div>
              {isPaid ? (
                <Button size="sm" variant="outline" onClick={handleManageSubscription} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Manage Subscription'}
                </Button>
              ) : (
                <Button size="sm" onClick={() => { setUpgradeReason('general'); setShowUpgradeModal(true); }}>
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
                  {FREE_FEATURES.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
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
            <div className="p-4 flex items-center justify-between border-t border-border">
              <div>
                <Label htmlFor="show-cents" className="font-medium">Show cents</Label>
                <p className="text-sm text-muted-foreground">
                  Off shows whole dollars where possible; amounts with real cents still show them
                </p>
              </div>
              <Switch
                id="show-cents"
                checked={settings.showCents ?? false}
                onCheckedChange={(checked) => setSettings(UserService.saveSettings({ showCents: checked }))}
              />
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
                  <p className="text-sm text-muted-foreground">Notify 3 days before due, coming soon</p>
                </div>
              </div>
              <Switch id="notifications" disabled checked={false} />
            </div>
          </div>
        </section>

        {/* Tax year Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Tax Year</h2>
          <div className="bg-card rounded-xl border border-border p-4">
            <Label className="font-medium">Your tax year starts in</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Used to work out which year a bill or document belongs to.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 1, label: 'January' },
                { value: 7, label: 'July' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettings(UserService.saveSettings({ taxYearStartMonth: option.value as 1 | 7 }))}
                  className={cn(
                    'p-3 rounded-lg border text-sm transition-colors',
                    (settings.taxYearStartMonth ?? 1) === option.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>


        {/* Data Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Data</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Household Summary */}
            <button
              onClick={() => navigate('/export/summary')}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Household Summary</p>
                <p className="text-sm text-muted-foreground">A printable report for family or an executor</p>
              </div>
              {!isPaid ? (
                <Lock className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {/* Tax Export */}
            <button
              onClick={() => navigate('/tax-documents')}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Tax Export</p>
                <p className="text-sm text-muted-foreground">A spreadsheet-ready file for your accountant</p>
              </div>
              {!isPaid ? (
                <Lock className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {/* Backup */}
            <button
              onClick={() => {
                if (isPaid) { downloadBackup(); return; }
                setUpgradeReason('export');
                setShowUpgradeModal(true);
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Backup Your Data</p>
                <p className="text-sm text-muted-foreground">A full copy for your own records</p>
              </div>
              {!isPaid ? (
                <Lock className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>


            {/* Payment Cards — a sheet, not a route */}
            <button
              onClick={() => setShowCardsSheet(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Payment Cards</p>
                <p className="text-sm text-muted-foreground">
                  Nickname and expiry only — so nobody's caught out by a dead card
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Bank Accounts — a sheet, not a route */}
            <button
              onClick={() => setShowBankAccountsSheet(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Bank Accounts</p>
                <p className="text-sm text-muted-foreground">
                  So everyone knows which account each bill comes from
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Recently Deleted — never paywalled */}
            <button
              onClick={() => navigate('/recently-deleted')}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Undo2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Recently Deleted</p>
                <p className="text-sm text-muted-foreground">Restore anything deleted in the last 30 days</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
            <div className="p-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Your data stays private. We don't sell or share it.
              </p>
            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showCardsSheet && <ManageCardsSheet onClose={() => setShowCardsSheet(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showBankAccountsSheet && <ManageBankAccountsSheet onClose={() => setShowBankAccountsSheet(false)} />}
      </AnimatePresence>

      <BottomNav />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
      />
    </div>
  );
};

const ProfileSection = () => {
  const { profile, updateDisplayName, uploadAvatar, loading: profileLoading } = useProfile();
  const { session } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (profileLoading) {
    return (
      <section className="mb-8">
        <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (!session) {
    return null;
  }

  const handleSaveName = async () => {
    if (!nameValue.trim()) { setNameError('Enter a name.'); return; }
    setSavingName(true);
    const { error } = await updateDisplayName(nameValue.trim());
    setSavingName(false);
    if (error) {
      toast.error('Could not save your name. Please try again.');
    } else {
      toast.success('Name updated');
      setEditingName(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2 MB');
      return;
    }
    setUploadingPhoto(true);
    const { error } = await uploadAvatar(file);
    setUploadingPhoto(false);
    if (error) {
      toast.error('Could not upload photo. Please try again.');
    } else {
      toast.success('Photo updated');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Profile</h2>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Avatar + name row */}
        <div className="flex items-center gap-4 p-4">
          <div className="relative">
            <UserAvatar
              displayName={profile?.displayName ?? 'You'}
              avatarUrl={profile?.avatarUrl}
              size="lg"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md disabled:opacity-50"
              aria-label="Change photo"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <div className="space-y-1">
                  <Input
                    value={nameValue}
                    onChange={(e) => { setNameValue(e.target.value); setNameError(''); }}
                    className={cn('h-9 max-w-[200px]', nameError && 'border-destructive')}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  {nameError && <p className="text-sm text-[hsl(var(--destructive))]">{nameError}</p>}
                </div>
                <Button size="sm" onClick={handleSaveName} disabled={savingName}>
                  {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNameValue(profile?.displayName ?? '');
                  setEditingName(true);
                }}
                className="text-left group"
              >
                <p className="font-medium text-lg group-hover:underline">{profile?.displayName ?? 'You'}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{profile?.householdName}</p>
              </button>
            )}
          </div>
        </div>
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground">
            {profile?.avatarUrl
              ? 'Click the camera icon to change your photo.'
              : `Showing your initials (${getInitials(profile?.displayName ?? 'You')}). Upload a photo to personalize.`}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Settings;
