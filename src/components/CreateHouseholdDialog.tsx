import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HouseholdService } from '@/services/HouseholdService';
import { HouseholdMembership } from '@/services/supabaseData';
import { roleLabel } from '@/hooks/useHouseholds';
import { useProfile } from '@/hooks/useProfile';
import { toast } from '@/hooks/use-toast';

interface CreateHouseholdDialogProps {
  open: boolean;
  onClose: () => void;
  currentMembership: HouseholdMembership | null;
}

const CreateHouseholdDialog = ({ open, onClose, currentMembership }: CreateHouseholdDialogProps) => {
  const { profile } = useProfile();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = (profile?.displayName ?? '').split(' ')[0] || 'My';
  const defaultName = `${firstName}'s household`;

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const id = await HouseholdService.createOwnHousehold(name.trim() || undefined);
      HouseholdService.switchTo(id, '/onboarding');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already') || msg.includes('owner')) {
        toast({ description: 'You already own a household — opening it.' });
        try {
          const memberships = await HouseholdService.listMemberships();
          const owned = memberships.find((m) => m.accessLevel === 'owner');
          if (owned) {
            HouseholdService.switchTo(owned.householdId, '/dashboard');
          } else {
            setError('Could not create your household. Please try again.');
            setSubmitting(false);
          }
        } catch {
          setError('Could not create your household. Please try again.');
          setSubmitting(false);
        }
      } else {
        setError(msg || 'Could not create your household. Please try again.');
        setSubmitting(false);
      }
    }
  };

  const currentRoleLabel = currentMembership
    ? roleLabel(currentMembership.accessLevel, currentMembership.role)
    : '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold">Create your own household</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {currentMembership && (
                <>
                  You'll stay a {currentRoleLabel} on {currentMembership.householdName}.{' '}
                </>
              )}
              This creates a separate household that you own, with its own bills, documents and people.
            </p>

            <div className="space-y-2 mb-4">
              <Label htmlFor="household-name">
                Household name <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="household-name"
                placeholder={defaultName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-[hsl(var(--destructive))] mb-4">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create household
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateHouseholdDialog;
