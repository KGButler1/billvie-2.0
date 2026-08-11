import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PersonRole, TrustedPerson } from '@/types/people';
import { PeopleService } from '@/services/PeopleService';
import { EntitlementService } from '@/services/EntitlementService';
import { usePlan } from '@/hooks/usePlan';

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

const InvitePersonModal = ({
  defaultName = '',
  defaultEmail = '',
  defaultRole = 'household',
  keyPersonId,
  onClose,
  onInvited,
}: InvitePersonModalProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState<PersonRole>(defaultRole);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const { isPaid } = usePlan();

  // Checked on role change, not on submit — the wall should be visible before effort is spent.
  useEffect(() => {
    const result = EntitlementService.canAddTrustedPerson(role, isPaid);
    setBlockedReason(result.allowed ? undefined : result.reason);
  }, [isPaid, role]);

  const canSubmit = name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(email.trim());

  const handleSubmit = async () => {
    if (!canSubmit || blockedReason) return;
    const person = await PeopleService.invite({ name: name.trim(), email: email.trim(), role, keyPersonId });
    onInvited(person);
  };

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
          <div>
            <h2 className="text-lg font-semibold">Invite someone you trust</h2>
            <p className="text-sm text-muted-foreground">They'll be able to see what you choose</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="invite-name">
              Their name
            </label>
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="invite-email">
              Their email
            </label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
              <Button className="w-full" onClick={() => navigate('/settings')}>
                Upgrade to Pro
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
              Send the invite
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InvitePersonModal;
