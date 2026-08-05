import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import AccessPicker from '@/components/people/AccessPicker';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';
import { AccessScope } from '@/types/people';

interface AccessSheetProps {
  scope: AccessScope;
  itemId: string;
  onClose: () => void;
}

// Writes immediately. No save button.
const AccessSheet = ({ scope, itemId, onClose }: AccessSheetProps) => {
  const read = (roleFilter: 'household' | 'professional') =>
    PeopleService.getAll()
      .filter((p) =>
        roleFilter === 'household' ? p.role === 'household' : p.role === 'advisor' || p.role === 'accountant'
      )
      .filter((p) => AccessService.canSee(p.id, scope, itemId))
      .map((p) => p.id);

  const [householdIds, setHouseholdIds] = useState<string[]>(() => read('household'));
  const [professionalIds, setProfessionalIds] = useState<string[]>(() => read('professional'));

  const apply = async (previous: string[], next: string[]) => {
    await Promise.all(next.filter((id) => !previous.includes(id)).map((id) => AccessService.grantItem(id, scope, itemId)));
    await Promise.all(
      previous
        .filter((id) => !next.includes(id))
        .map((id) => AccessService.revokeScopeForPerson(id, scope, itemId))
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Who can see this?</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Your household</label>
            <AccessPicker
              scope={scope}
              itemId={itemId}
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
              scope={scope}
              itemId={itemId}
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

export default AccessSheet;
