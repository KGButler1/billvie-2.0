import { useMemo, useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { PeopleService } from '@/services/PeopleService';
import { AccessService } from '@/services/AccessService';
import { AccessScope } from '@/types/people';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('') || '?';

const Avatar = ({ name, muted }: { name: string; muted?: boolean }) => (
  <span
    className={`w-4 h-4 rounded-full text-[9px] font-medium flex items-center justify-center flex-shrink-0 ${
      muted ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'
    }`}
  >
    {initials(name)}
  </span>
);

const scopeMissingLabel: Partial<Record<AccessScope, string>> = {
  bills: "(can't see bills yet)",
  documents: "(can't see documents yet)",
  events: "(can't see events yet)",
  tax_documents: "(can't see tax documents yet)",
  key_people: "(can't see key contacts yet)",
};

interface PersonTagPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  scope: AccessScope;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Tagging is wayfinding. It never grants access and never sends anything.
export const PersonTagPicker = ({
  value,
  onChange,
  scope,
  open: controlledOpen,
  onOpenChange,
}: PersonTagPickerProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const candidates = useMemo(
    () => PeopleService.getAll().filter((p) => p.status === 'invited' || p.status === 'active'),
    []
  );

  const selected = candidates.filter((p) => value.includes(p.id));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded-full bg-muted text-xs"
          >
            <Avatar name={p.name} />
            {p.name}
            <button
              type="button"
              aria-label={`Remove ${p.name}`}
              onClick={() => toggle(p.id)}
              className="p-0.5 rounded-full hover:bg-background"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <Plus className="w-3 h-3" /> For…
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-64" align="start">
            <Command>
              <CommandInput placeholder="Search people…" />
              <CommandList>
                <CommandEmpty className="py-4 px-3 text-xs text-muted-foreground">
                  No one to point to yet. Invite someone from People first.
                </CommandEmpty>
                <CommandGroup>
                  {candidates.map((p) => {
                    const granted = AccessService.getGrantsForPerson(p.id).some(
                      (g) => g.scope === scope
                    );
                    return (
                      <CommandItem key={p.id} value={p.name} onSelect={() => toggle(p.id)}>
                        <Avatar name={p.name} />
                        <span className="ml-2 truncate">{p.name}</span>
                        {!granted && (
                          <span className="ml-1 text-xs text-muted-foreground truncate">
                            {scopeMissingLabel[scope]}
                          </span>
                        )}
                        {value.includes(p.id) && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground">
        Point someone to this. It doesn't change who can see it.
      </p>
    </div>
  );
};

interface PersonTagChipsProps {
  personIds?: string[];
  className?: string;
}

export const PersonTagChips = ({ personIds, className }: PersonTagChipsProps) => {
  if (!personIds || personIds.length === 0) return null;

  const people = personIds
    .map((id) => PeopleService.getById(id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  if (people.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className || ''}`}>
      {people.map((p) => {
        const removed = p.status === 'removed';
        const text = removed ? `${p.name} — no longer has access` : `For ${p.name}`;
        return (
          <span
            key={p.id}
            title={text}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
              removed ? 'bg-muted/60 text-muted-foreground' : 'bg-primary/10 text-foreground'
            }`}
          >
            <Avatar name={p.name} muted={removed} />
            <span className="truncate max-w-[16rem]">{text}</span>
          </span>
        );
      })}
    </div>
  );
};
