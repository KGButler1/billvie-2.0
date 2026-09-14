import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import AccessPicker from '@/components/people/AccessPicker';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';

// Whole-scope only: the financial snapshot is shared as one thing.
// Same shape as TaxAccessSheet but always grants the whole financial_info scope.
interface FinancialAccessSheetProps {
  onClose: () => void;
}

const SCOPE = 'financial_info' as const;

const FinancialAccessSheet = ({ onClose }: FinancialAccessSheetProps) => {
  const read = (roleFilter: 'household' | 'professional') =>
    PeopleService.getAll()
      .filter((p) =>
        roleFilter === 'household' ? p.role === 'household' : p.role === 'advisor' || p.role === 'accountant'
      )
      .filter((p) => AccessService.canSee(p.id, SCOPE))
      .map((p) => p.id);

  const [householdIds, setHouseholdIds] = useState<string[]>(() => read('household'));
  const [professionalIds, setProfessionalIds] = useState<string[]>(() => read('professional'));

  const apply = async (previous: string[], next: string[]) => {
    await Promise.all(
      next
        .filter((id) => !previous.includes(id))
        .map((id) => AccessService.grantWholeScope(id, SCOPE))
    );
    await Promise.all(
      previous
        .filter((id) => !next.includes(id))
        .map((id) => AccessService.revokeScopeForPerson(id, SCOPE))
    );
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
        <div className="flex items-start justify-between mb-5 gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Who can see this?</h2>
            <p className="text-sm text-muted-foreground">Shared as a whole — insurance, savings, income, what's owed and anything else here.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Your household</label>
            <AccessPicker
              scope={SCOPE}
              roleFilter="household"
              selectedPersonIds={householdIds}
              onChange={(next) => {
                apply(householdIds, next);
                setHouseholdIds(next);
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Your advisor or accountant</label>
            <AccessPicker
              scope={SCOPE}
              roleFilter="professional"
              selectedPersonIds={professionalIds}
              onChange={(next) => {
                apply(professionalIds, next);
                setProfessionalIds(next);
              }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FinancialAccessSheet;
