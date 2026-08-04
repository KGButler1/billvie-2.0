import { useState } from 'react';
import AccessPicker from '@/components/people/AccessPicker';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';

// Whole-scope only: the financial snapshot is shared as one thing.
const FinancialAccessCard = () => {
  const read = (roleFilter: 'household' | 'professional') =>
    PeopleService.getAll()
      .filter((p) =>
        roleFilter === 'household' ? p.role === 'household' : p.role === 'advisor' || p.role === 'accountant'
      )
      .filter((p) => AccessService.canSee(p.id, 'financial_info'))
      .map((p) => p.id);

  const [householdIds, setHouseholdIds] = useState<string[]>(() => read('household'));
  const [professionalIds, setProfessionalIds] = useState<string[]>(() => read('professional'));

  const apply = (previous: string[], next: string[]) => {
    next
      .filter((id) => !previous.includes(id))
      .forEach((id) => AccessService.grantWholeScope(id, 'financial_info'));
    previous
      .filter((id) => !next.includes(id))
      .forEach((id) => AccessService.revokeScopeForPerson(id, 'financial_info'));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Who can see this?</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Shared as a whole — insurance, savings, income, what's owed and anything else here.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Your household</label>
          <AccessPicker
            scope="financial_info"
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
            scope="financial_info"
            roleFilter="professional"
            selectedPersonIds={professionalIds}
            onChange={(next) => {
              apply(professionalIds, next);
              setProfessionalIds(next);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FinancialAccessCard;
