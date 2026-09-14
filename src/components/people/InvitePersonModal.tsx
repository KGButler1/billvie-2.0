import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, Loader as Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PersonRole, TrustedPerson, ACCESS_SCOPES, ACCESS_SCOPE_LABELS, AccessScope } from '@/types/people';
import { PeopleService } from '@/services/PeopleService';
import { EntitlementService } from '@/services/EntitlementService';
import { toast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import FieldError from '@/components/ui/field-error';
import UpgradeModal from '@/components/UpgradeModal';

interface InvitePersonModalProps {
  defaultName?: string;
  defaultEmail?: string;
  defaultRole?: PersonRole;
  keyPersonId?: string;
  onClose: () => void;
  onInvited: (person: TrustedPerson) => void;
}

const ROLE_OPTIONS: { value: PersonRole; label: string }[] = [
  { value: 'household', label: 'Someone in my household' },
  { value: 'advisor', label: 'My advisor' },
  { value: 'accountant', label: 'My accountant' },
];

type AccessLevelChoice = 'trusted_person' | 'co_owner';

const InvitePersonModal = ({
  defaultName = '',
  defaultEmail = '',
  defaultRole = 'household',
  keyPersonId,
  onClose,
  onInvited,
}: InvitePersonModalProps) => {
  const { profile } = useProfile();
  const isPaid = profile?.isPaid ?? false;
  const [stage, setStage] = useState<1 | 2>(1);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState<PersonRole>(defaultRole);
  const [accessChoice, setAccessChoice] = useState<AccessLevelChoice>('trusted_person');
  const [selectedScopes, setSelectedScopes] = useState<Set<AccessScope>>(new Set());
  const [canEdit, setCanEdit] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const result = EntitlementService.canAddTrustedPerson(role, isPaid);
    setBlockedReason(result.allowed ? undefined : result.reason);
  }, [role, isPaid]);

  const canSubmit = name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(email.trim());

  const handleStage1Submit = () => {
    let hasError = false;
    if (!name.trim()) { setNameError('Enter a name.'); hasError = true; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setEmailError('Enter a valid email address.'); hasError = true; }
    if (hasError || blockedReason) return;
    setStage(2);
  };

  const toggleScope = (scope: AccessScope) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSending(true);
    try {
      const accessLevel = role === 'household' ? accessChoice : 'trusted_person';
      const scopes = accessLevel === 'co_owner' ? undefined : Array.from(selectedScopes);
      const result = await PeopleService.invite({
        name: name.trim(),
        email: email.trim(),
        role,
        keyPersonId,
        accessLevel,
        scopes: scopes && scopes.length > 0 ? scopes : undefined,
        canEdit,
      });
      if (result.warning) {
        toast({ description: result.warning });
      }
      onInvited(result.person);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send the invite.';
      toast({ description: msg, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const showScopeToggles = role !== 'household' || accessChoice === 'trusted_person';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            {stage === 2 && (
              <button
                type="button"
                onClick={() => setStage(1)}
                className="p-2 hover:bg-muted rounded-lg"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold">
                {stage === 1 ? 'Invite someone you trust' : 'Choose their access'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {stage === 1
                  ? "They'll be able to see what you choose"
                  : `What ${name.trim() || 'they'} can see once they accept`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {stage === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block" htmlFor="invite-name">
                Their name <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <Input id="invite-name" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} className={nameError ? 'border-destructive' : undefined} autoFocus />
              <FieldError message={nameError} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block" htmlFor="invite-email">
                Their email <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(''); }} className={emailError ? 'border-destructive' : undefined} />
              <FieldError message={emailError} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Who are they to you?</label>
              <Select value={role} onValueChange={(v) => setRole(v as PersonRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              They'll get a link. You choose what they can see once they're in.
            </p>

            {blockedReason ? (
              <div className="space-y-3 pt-1">
                <p className="text-sm">{blockedReason}</p>
                <Button className="w-full" onClick={() => setShowUpgrade(true)}>
                  Upgrade to Pro
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={handleStage1Submit} disabled={!canSubmit}>
                Continue
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {role === 'household' && (
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    accessChoice === 'trusted_person' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-0.5"
                    checked={accessChoice === 'trusted_person'}
                    onChange={() => setAccessChoice('trusted_person')}
                  />
                  <div>
                    <p className="text-sm font-medium">Trusted access</p>
                    <p className="text-xs text-muted-foreground">You choose exactly what they can see.</p>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    accessChoice === 'co_owner' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-0.5"
                    checked={accessChoice === 'co_owner'}
                    onChange={() => setAccessChoice('co_owner')}
                  />
                  <div>
                    <p className="text-sm font-medium">Equal access — co-owner</p>
                    <p className="text-xs text-muted-foreground">
                      Sees and manages everything, same as you — except they can't remove you.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {showScopeToggles && (
              <>
                <div>
                  <p className="text-sm font-medium mb-1">What they can see</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Turn on the categories you want to share. You can change this any time.
                  </p>
                  <div className="space-y-1">
                    {ACCESS_SCOPES.map((scope) => (
                      <label
                        key={scope}
                        className="flex items-center justify-between min-h-[44px] gap-4 cursor-pointer"
                      >
                        <span className="text-sm min-w-0">{ACCESS_SCOPE_LABELS[scope]}</span>
                        <Switch
                          checked={selectedScopes.has(scope)}
                          onCheckedChange={() => toggleScope(scope)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="pt-1">
                  <label className="flex items-center justify-between min-h-[44px] gap-4 cursor-pointer">
                    <span className="text-sm min-w-0">
                      Can also make changes
                      <span className="block text-xs text-muted-foreground">Add, edit, and delete — not just view</span>
                    </span>
                    <Switch
                      checked={canEdit}
                      onCheckedChange={setCanEdit}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:underline"
                  onClick={handleSubmit}
                  disabled={sending}
                >
                  Skip — decide later
                </button>
              </>
            )}

            {accessChoice === 'co_owner' && role === 'household' && (
              <p className="text-sm text-muted-foreground">
                A co-owner sees everything automatically — no need to pick categories.
              </p>
            )}

            <Button className="w-full" onClick={handleSubmit} disabled={sending || (showScopeToggles && false)}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending invite…
                </>
              ) : (
                'Send the invite'
              )}
            </Button>
          </div>
        )}
      </motion.div>
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="people"
      />
    </motion.div>
  );
};

export default InvitePersonModal;
