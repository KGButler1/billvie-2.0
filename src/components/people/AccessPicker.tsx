import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AccessScope, ACCESS_SCOPE_LABELS, PERSON_ROLE_LABELS } from '@/types/people';
import { PeopleService } from '@/services/PeopleService';
import { AccessService } from '@/services/AccessService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { allItemIds, scopeAccessLabel } from '@/utils/scopeItems';
import { KEY_PERSON_RELATIONSHIP_LABELS, KeyPersonRelationship } from '@/types/keyPerson';

const firstName = (name: string) => name.trim().split(' ')[0] || name;

const joinNames = (names: string[]) => {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} others`;
};

export interface AccessPickerProps {
  scope: AccessScope;
  itemId?: string;
  roleFilter: 'household' | 'professional';
  selectedPersonIds: string[];
  onChange: (personIds: string[]) => void;
}

const AccessPicker = ({ scope, itemId, roleFilter, selectedPersonIds, onChange }: AccessPickerProps) => {
  const [open, setOpen] = useState(false);
  const [narrowing, setNarrowing] = useState<string | null>(null);

  const people = useMemo(
    () =>
      PeopleService.getAll().filter((p) =>
        roleFilter === 'household'
          ? p.role === 'household' && p.accessLevel !== 'owner'
          : p.role === 'advisor' || p.role === 'accountant'
      ),
    [roleFilter]
  );

  const keyPeople = useMemo(() => KeyPeopleService.getAllKeyPeople(), []);
  const scopeLabel = ACCESS_SCOPE_LABELS[scope].toLowerCase();

  const secondLine = (personId: string, role: string, keyPersonId?: string) => {
    const kp = keyPersonId ? keyPeople.find((k) => k.id === keyPersonId) : undefined;
    const relationship = kp
      ? KEY_PERSON_RELATIONSHIP_LABELS[kp.relationship as KeyPersonRelationship] || String(kp.relationship)
      : PERSON_ROLE_LABELS[role as keyof typeof PERSON_ROLE_LABELS];
    return [relationship, scopeAccessLabel(personId, scope, scopeLabel)].filter(Boolean).join(' · ');
  };

  if (people.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
        <p className="text-sm text-muted-foreground">
          {roleFilter === 'household'
            ? `No one can see your ${scopeLabel} yet.`
            : "You haven't added an advisor yet."}
        </p>
        <Link to="/people?invite=1" className="text-sm text-primary hover:underline">
          {roleFilter === 'household' ? 'Invite someone you trust' : 'Add an advisor'}
        </Link>
      </div>
    );
  }

  const selectedNames = people
    .filter((p) => selectedPersonIds.includes(p.id))
    .map((p) => firstName(p.name));

  const sentence =
    selectedNames.length === 0
      ? 'Only you can see this'
      : `${joinNames(selectedNames)} will see this`;

  const toggle = (personId: string, next: boolean) => {
    if (!next && AccessService.hasWholeScope(personId, scope)) {
      setNarrowing(personId);
      return;
    }
    onChange(
      next ? [...selectedPersonIds, personId] : selectedPersonIds.filter((id) => id !== personId)
    );
  };

  const confirmNarrow = async (personId: string) => {
    const keep = allItemIds(scope).filter((id) => id !== itemId);
    await AccessService.narrowToItems(personId, scope, keep);
    setNarrowing(null);
    onChange(selectedPersonIds.filter((id) => id !== personId));
  };

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="text-sm text-muted-foreground min-w-0 truncate">{sentence}</p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-sm text-primary hover:underline shrink-0"
        >
          {open ? 'Done' : 'Choose'}
        </button>
      </div>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {people.map((person) =>
            narrowing === person.id ? (
              <div key={person.id} className="p-3 space-y-3 bg-muted/40">
                <p className="text-sm">
                  {person.name} can currently see all your {scopeLabel}. Hiding this one means choosing{' '}
                  {firstName(person.name)}'s {scopeLabel} individually from now on — including anything you add
                  later.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => confirmNarrow(person.id)}>
                    Hide this one anyway
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNarrowing(null)}>
                    Leave it shared
                  </Button>
                </div>
              </div>
            ) : (
              <label
                key={person.id}
                className="flex items-center gap-3 p-3 min-h-[56px] cursor-pointer hover:bg-muted/40"
              >
                <Checkbox
                  checked={selectedPersonIds.includes(person.id)}
                  onCheckedChange={(v) => toggle(person.id, v === true)}
                />
                <div className="w-8 h-8 shrink-0 rounded-full bg-primary/15 flex items-center justify-center text-xs font-medium">
                  {person.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{firstName(person.name)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {secondLine(person.id, person.role, person.keyPersonId)}
                  </p>
                </div>
              </label>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default AccessPicker;
