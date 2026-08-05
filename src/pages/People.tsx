import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PeopleService, DirectoryEntry } from '@/services/PeopleService';
import { AccessService } from '@/services/AccessService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { UserService } from '@/services/UserService';
import { ACCESS_SCOPES, ACCESS_SCOPE_LABELS, AccessScope, PersonRole } from '@/types/people';
import { scopeAccessSummary } from '@/utils/scopeItems';
import { KeyPerson } from '@/types/keyPerson';
import InvitePersonModal from '@/components/people/InvitePersonModal';
import KeyPersonModal from '@/components/keypeople/KeyPersonModal';
import ShareContentPreview from '@/components/sharing/ShareContentPreview';
import { cn } from '@/lib/utils';

const firstName = (name: string) => name.trim().split(' ')[0] || name;

const joinScopes = (scopes: AccessScope[]) => {
  const labels = scopes.map((s, i) =>
    i === 0 ? ACCESS_SCOPE_LABELS[s] : ACCESS_SCOPE_LABELS[s].toLowerCase()
  );
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
};

const daysAgo = (iso?: string) => {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
};

const formatDay = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '';

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="mb-8">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    <div className="mt-3 rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
      {children}
    </div>
  </section>
);

const People = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<
    | null
    | { name?: string; email?: string; role?: PersonRole; keyPersonId?: string }
  >(null);
  const [keyPersonState, setKeyPersonState] = useState<
    | null
    | { person?: KeyPerson; defaults?: { name?: string; email?: string }; linkTo?: string }
  >(null);
  const [confirmRemove, setConfirmRemove] = useState<DirectoryEntry | null>(null);

  const settings = UserService.getSettings();
  const isPaid = settings.userType === 'paid' || settings.userType === 'accountant';

  const reload = useCallback(() => setDirectory(PeopleService.getDirectory()), []);

  useEffect(() => {
    PeopleService.refresh().then(reload).catch(console.error);
  }, [reload]);

  useEffect(() => {
    if (searchParams.get('invite') === '1') {
      setInviteState({});
      searchParams.delete('invite');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const householdRows = directory.filter((d) => d.role === 'household');
  const professionalRows = directory.filter((d) => d.role === 'advisor' || d.role === 'accountant');
  const contactRows = directory.filter((d) => d.role === 'contact');

  const activePeople = useMemo(() => AccessService.getActivePeople(), [directory]);

  const statusLine =
    activePeople.length === 0
      ? 'Right now, no one else can see any of this.'
      : activePeople.length === 1
        ? `${activePeople[0].name} could step in if they needed to.`
        : `${activePeople.length} people could step in if they needed to.`;

  const showFreeNote = !isPaid && householdRows.length >= 1;

  const toggleScope = async (entry: DirectoryEntry, scope: AccessScope, next: boolean) => {
    if (!entry.trustedPersonId) return;
    try {
      if (next) {
        await AccessService.grant(entry.trustedPersonId, scope);
        toast({ description: `${entry.name} can now see your ${ACCESS_SCOPE_LABELS[scope].toLowerCase()}` });
      } else {
        const grant = AccessService.getGrantsForPerson(entry.trustedPersonId).find((g) => g.scope === scope);
        if (grant) await AccessService.revoke(grant.id);
      }
    } catch {
      toast({ description: "That didn't save. Nothing has changed.", variant: 'destructive' });
    }
    reload();
  };

  const handleStopSharing = async () => {
    if (!confirmRemove?.trustedPersonId) return;
    await PeopleService.remove(confirmRemove.trustedPersonId);
    setConfirmRemove(null);
    setExpanded(null);
    reload();
  };

  const saveKeyPerson = async (data: Omit<KeyPerson, 'id' | 'createdAt' | 'updatedAt'>) => {
    const state = keyPersonState;
    if (!state) return;
    if (state.person) {
      await KeyPeopleService.updateKeyPerson(state.person.id, data);
    } else {
      const created = await KeyPeopleService.addKeyPerson(data);
      if (state.linkTo) await PeopleService.linkToKeyPerson(state.linkTo, created.id);
    }
    setKeyPersonState(null);
    reload();
  };

  const renderSecondLine = (entry: DirectoryEntry) => {
    if (entry.role === 'contact') {
      const kp = entry.keyPersonId
        ? KeyPeopleService.getAllKeyPeople().find((k) => k.id === entry.keyPersonId)
        : undefined;
      return [entry.relationship, kp?.role].filter(Boolean).join(' · ');
    }
    if (entry.status === 'invited') {
      const person = entry.trustedPersonId ? PeopleService.getById(entry.trustedPersonId) : undefined;
      const d = daysAgo(person?.invitedAt);
      return `Invited ${d === 0 ? 'today' : `${d} day${d === 1 ? '' : 's'} ago`} — waiting for ${firstName(entry.name)}`;
    }
    if (entry.scopes.length === 0) return "Signed in, but can't see anything yet";
    return `Can see ${joinScopes(entry.scopes)}`;
  };

  const Row = ({ entry }: { entry: DirectoryEntry }) => {
    const isOpen = expanded === entry.key;
    const person = entry.trustedPersonId ? PeopleService.getById(entry.trustedPersonId) : undefined;
    const history = entry.trustedPersonId ? AccessService.getHistoryForPerson(entry.trustedPersonId) : [];

    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded(isOpen ? null : entry.key)}
          aria-expanded={isOpen}
          aria-controls={`panel-${entry.key}`}
          className="w-full min-h-[56px] flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="w-9 h-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center text-sm font-medium">
            {entry.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{entry.name}</span>
              {entry.hasAccess && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                  Has access
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{renderSecondLine(entry)}</p>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              id={`panel-${entry.key}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border bg-muted/20"
            >
              <div className="p-4 space-y-4">
                {entry.trustedPersonId ? (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-2">What {firstName(entry.name)} can see</p>
                      <div className="space-y-1">
                        {ACCESS_SCOPES.map((scope) => (
                          <label
                            key={scope}
                            className="flex items-center justify-between min-h-[44px] gap-4 cursor-pointer"
                          >
                            <span className="text-sm min-w-0">
                              {ACCESS_SCOPE_LABELS[scope]}
                              {(() => {
                                if (!entry.trustedPersonId) return null;
                                const s = scopeAccessSummary(entry.trustedPersonId, scope);
                                if (s.kind !== 'partial') return null;
                                return (
                                  <span className="block text-xs text-muted-foreground">
                                    Sees {s.seen} of {s.total} — new ones aren't shared automatically
                                  </span>
                                );
                              })()}
                            </span>
                            <Switch
                              checked={entry.scopes.includes(scope)}
                              onCheckedChange={(v) => toggleScope(entry, scope, v)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {entry.scopes.length > 0 && (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0"
                          onClick={() => setPreviewOpen(previewOpen === entry.key ? null : entry.key)}
                        >
                          Preview what {firstName(entry.name)} sees
                        </Button>
                        {previewOpen === entry.key && (
                          <div className="mt-2 rounded-lg border border-border bg-background p-4 max-h-80 overflow-y-auto">
                            {entry.scopes.map((scope) => (
                              <ShareContentPreview key={scope} scope={scope} personId={person.id} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {history.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Earlier access</p>
                        {history.map((g) => (
                          <p key={g.id} className="text-xs text-muted-foreground">
                            {ACCESS_SCOPE_LABELS[g.scope]} — removed {formatDay(g.revokedAt)}
                          </p>
                        ))}
                      </div>
                    )}

                    {!entry.keyPersonId && (
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() =>
                          setKeyPersonState({
                            defaults: { name: entry.name, email: entry.email },
                            linkTo: entry.trustedPersonId,
                          })
                        }
                      >
                        Add continuity notes about {firstName(entry.name)}
                      </button>
                    )}

                    {person?.status === 'invited' && (
                      <button
                        type="button"
                        className="block text-sm text-primary hover:underline"
                        onClick={() =>
                          toast({ description: `The invite for ${firstName(entry.name)} has been sent again.` })
                        }
                      >
                        Send again
                      </button>
                    )}

                    <button
                      type="button"
                      className="block text-sm text-destructive hover:underline"
                      onClick={() => setConfirmRemove(entry)}
                    >
                      Stop sharing with {firstName(entry.name)}
                    </button>
                  </>
                ) : entry.email ? (
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() =>
                      setInviteState({ name: entry.name, email: entry.email, keyPersonId: entry.keyPersonId })
                    }
                  >
                    Give {firstName(entry.name)} access
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => {
                      const kp = KeyPeopleService.getAllKeyPeople().find((k) => k.id === entry.keyPersonId);
                      if (kp) setKeyPersonState({ person: kp });
                    }}
                  >
                    Add an email to share with {firstName(entry.name)}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const EmptyState = ({ text, action }: { text: string; action: React.ReactNode }) => (
    <div className="p-6 text-center space-y-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24 lg:pt-16">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <h1 className="text-xl font-bold">Trusted People</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-20 lg:pt-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold hidden lg:block mb-2">Trusted People</h1>
          <p className="text-base">{statusLine}</p>
          {showFreeNote && (
            <p className="text-xs text-muted-foreground mt-1">
              Free includes one trusted person. Advisors and accountants are always free, however many you add.
            </p>
          )}
        </div>

        <Section title="Your household">
          {householdRows.length === 0 ? (
            <EmptyState
              text="No one in your household can see this yet."
              action={
                <Button onClick={() => setInviteState({ role: 'household' })}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite someone you trust
                </Button>
              }
            />
          ) : (
            <>
              {householdRows.map((entry) => (
                <Row key={entry.key} entry={entry} />
              ))}
              <div className="p-3">
                <Button variant="ghost" size="sm" onClick={() => setInviteState({ role: 'household' })}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite someone you trust
                </Button>
              </div>
            </>
          )}
        </Section>

        <Section title="Advisors & accountants" subtitle="Always free, however many you need.">
          {professionalRows.length === 0 ? (
            <EmptyState
              text="No advisor or accountant added."
              action={
                <Button variant="outline" onClick={() => setInviteState({ role: 'advisor' })}>
                  Add an advisor
                </Button>
              }
            />
          ) : (
            <>
              {professionalRows.map((entry) => (
                <Row key={entry.key} entry={entry} />
              ))}
              <div className="p-3">
                <Button variant="ghost" size="sm" onClick={() => setInviteState({ role: 'advisor' })}>
                  Add an advisor
                </Button>
              </div>
            </>
          )}
        </Section>

        <Section
          title="Key contacts"
          subtitle="People your family might need to reach. They can't see anything unless you give them access."
        >
          {contactRows.length === 0 ? (
            <EmptyState
              text="No one added yet."
              action={
                <Button variant="outline" onClick={() => navigate('/key-people?add=1')}>
                  Add a key contact
                </Button>
              }
            />
          ) : (
            <>
              {contactRows.map((entry) => (
                <Row key={entry.key} entry={entry} />
              ))}
              <div className="p-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/key-people')}>
                  Manage key contacts
                </Button>
              </div>
            </>
          )}
        </Section>
      </main>

      <BottomNav />

      <AnimatePresence>
        {inviteState && (
          <InvitePersonModal
            defaultName={inviteState.name}
            defaultEmail={inviteState.email}
            defaultRole={inviteState.role}
            keyPersonId={inviteState.keyPersonId}
            onClose={() => setInviteState(null)}
            onInvited={(person) => {
              setInviteState(null);
              reload();
              setExpanded(`tp:${person.id}`);
            }}
          />
        )}
        {keyPersonState && (
          <KeyPersonModal
            person={keyPersonState.person}
            defaults={keyPersonState.defaults}
            onSave={saveKeyPerson}
            onClose={() => setKeyPersonState(null)}
          />
        )}
      </AnimatePresence>

      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Stop sharing with {confirmRemove ? firstName(confirmRemove.name) : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.name} will no longer be able to see anything. You can share again any time — nothing is
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep sharing</AlertDialogCancel>
            <AlertDialogAction onClick={handleStopSharing}>Stop sharing</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default People;
