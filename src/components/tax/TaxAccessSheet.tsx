import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import AccessPicker from '@/components/people/AccessPicker';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';

// Same shape and behaviour as documents/AccessSheet, but itemId is optional so
// the tax area can grant either the whole tax_documents scope or a single row.
// Writes immediately. No save button.
interface TaxAccessSheetProps {
  itemId?: string;
  title?: string;
  onClose: () => void;
}

const SCOPE = 'tax_documents' as const;

const TaxAccessSheet = ({ itemId, title, onClose }: TaxAccessSheetProps) => {
  const read = (roleFilter: 'household' | 'professional') =>
    PeopleService.getAll()
      .filter((p) =>
        roleFilter === 'household' ? p.role === 'household' : p.role === 'advisor' || p.role === 'accountant'
      )
      .filter((p) => AccessService.canSee(p.id, SCOPE, itemId))
      .map((p) => p.id);

  const [householdIds, setHouseholdIds] = useState<string[]>(() => read('household'));
  const [professionalIds, setProfessionalIds] = useState<string[]>(() => read('professional'));

  const apply = (previous: string[], next: string[]) => {
    next
      .filter((id) => !previous.includes(id))
      .forEach((id) =>
        itemId ? AccessService.grantItem(id, SCOPE, itemId) : AccessService.grantWholeScope(id, SCOPE)
      );
    previous
      .filter((id) => !next.includes(id))
      .forEach((id) => AccessService.revokeScopeForPerson(id, SCOPE, itemId));
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
            {title && <p className="text-sm text-muted-foreground truncate">{title}</p>}
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
              scope={SCOPE}
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

export default TaxAccessSheet;
