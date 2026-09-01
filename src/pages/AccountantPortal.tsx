import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, UserPlus, Eye, Clock, CircleCheck as CheckCircle, Circle as XCircle, Copy, Check, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountantClient, AccountantProfile } from '@/types/sharing';
import { AccountantService } from '@/services/AccountantService';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { TaxTagService } from '@/services/TaxTagService';
import { Bill } from '@/types/bill';
import { HouseholdDocument } from '@/types/document';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currency';
import FieldError from '@/components/ui/field-error';

const AccountantPortal = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AccountantProfile | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [viewingClient, setViewingClient] = useState<AccountantClient | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    const p = AccountantService.getProfile();
    setProfile(p);
    if (!p) {
      setIsSettingUp(true);
    }
  };

  const handleCopyId = () => {
    if (profile) {
      navigator.clipboard.writeText(profile.accountantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAcceptClient = (clientId: string) => {
    AccountantService.acceptClient(clientId);
    loadProfile();
  };

  const handleDisconnectClient = (clientId: string) => {
    if (confirm('Disconnect this client? They can reconnect later.')) {
      AccountantService.disconnectClient(clientId);
      loadProfile();
    }
  };

  if (isSettingUp && !profile) {
    return (
      <AccountantSetup 
        onComplete={() => {
          setIsSettingUp(false);
          loadProfile();
        }}
        onBack={() => navigate('/more')}
      />
    );
  }

  if (viewingClient) {
    return (
      <ClientTaxView 
        client={viewingClient}
        onBack={() => setViewingClient(null)}
      />
    );
  }

  const connectedClients = profile?.clients.filter(c => c.connectionStatus === 'connected') || [];
  const pendingClients = profile?.clients.filter(c => c.connectionStatus === 'pending') || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/more')} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Accountant Portal</h1>
            <p className="text-xs text-muted-foreground">{profile?.displayName}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Accountant ID Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your Accountant ID</p>
              <p className="font-mono font-bold text-lg">{profile?.accountantId}</p>
              <p className="text-xs text-muted-foreground mt-1">
                This is how client connections will work once accounts sync online. For now, here's a preview with sample clients.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyId}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </motion.div>

        {/* Pending Requests */}
        {pendingClients.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Requests ({pendingClients.length})
            </h2>
            <div className="space-y-3">
              {pendingClients.map((client) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAcceptClient(client.id)}>
                      Accept
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Connected Clients */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Connected Clients ({connectedClients.length})
          </h2>
          
          {connectedClients.length > 0 ? (
            <div className="space-y-3">
              {connectedClients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Last updated: {format(new Date(client.lastUpdated), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingClient(client)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-muted/30 rounded-xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No clients yet</h3>
              <p className="text-sm text-muted-foreground">
                Real client connections arrive when accounts sync online. Load sample clients to see how this will look.
              </p>
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

// Setup Screen
interface AccountantSetupProps {
  onComplete: () => void;
  onBack: () => void;
}

const AccountantSetup = ({ onComplete, onBack }: AccountantSetupProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleCreate = () => {
    let hasError = false;
    if (!name.trim()) { setNameError('Enter your name.'); hasError = true; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setEmailError('Enter a valid email.'); hasError = true; }
    if (hasError) return;
    AccountantService.createProfile(name.trim(), email.trim());
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Accountant Setup</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome, Accountant!</h2>
          <p className="text-muted-foreground">
            Set up your profile to start receiving client connections.
          </p>
        </motion.div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name <span className="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              id="name"
              placeholder="e.g., John Smith CPA"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              className={nameError ? 'border-destructive' : undefined}
            />
            <FieldError message={nameError} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Professional Email <span className="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="john@accounting.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              className={emailError ? 'border-destructive' : undefined}
            />
            <FieldError message={emailError} />
          </div>

          <Button 
            onClick={handleCreate} 
            className="w-full mt-6"
          >
            Create Accountant Profile
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            This is free for accountants. Your clients share their tax documents with you for easy collaboration.
          </p>
        </div>
      </main>
    </div>
  );
};

// Client Tax View
interface ClientTaxViewProps {
  client: AccountantClient;
  onBack: () => void;
}

const ClientTaxView = ({ client, onBack }: ClientTaxViewProps) => {
  const currentYear = new Date().getFullYear();
  const categories = TaxDocumentService.getCategories();
  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label || id;
  const categoryIcon = (id: string) => categories.find((c) => c.id === id)?.icon || '📄';

  // Same shape as the household's own tax view: direct entries plus anything
  // tagged as tax-relevant on a bill or document.
  const rows = [
    ...TaxDocumentService.getAllDocuments()
      .filter((d) => d.year === currentYear)
      .map((d) => ({
        key: d.id,
        name: d.name,
        categories: d.categories.length ? d.categories : ['other'],
        amount: d.amount,
        notes: d.notes,
        businessName: undefined as string | undefined,
      })),
    ...TaxTagService.getResolvedItemsForYear(currentYear).map(({ item, tag }) => ({
      key: tag.id,
      name: tag.itemType === 'bill' ? (item as Bill).name : (item as HouseholdDocument).title,
      categories: tag.categories?.length ? tag.categories : ['other'],
      amount: tag.itemType === 'bill' ? (item as Bill).amount : undefined,
      notes: item.notes,
      businessName: tag.businessName,
    })),
  ];

  const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 px-4 text-center text-sm">
        <span className="text-primary font-medium">
          Viewing: {client.name}'s Tax Documents
        </span>
      </div>

      <header className="fixed top-8 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{client.name}</h1>
            <p className="text-xs text-muted-foreground">{client.email}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-28">
        {rows.length > 0 ? (
          <>
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
              <p className="text-sm text-muted-foreground">{currentYear} total</p>
              <p className="text-3xl font-semibold">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground mt-1">{rows.length} items shared</p>
            </div>

            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.key} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {categoryIcon(row.categories[0])}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{row.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {row.categories.map(categoryLabel).join(', ')}
                        {row.businessName && ` • ${row.businessName}`}
                        {row.amount !== undefined && ` • ${formatCurrency(row.amount)}`}
                      </p>
                      {row.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{row.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tax documents shared yet.</p>
          </div>
        )}
      </main>
    </div>
  );
};


export default AccountantPortal;
