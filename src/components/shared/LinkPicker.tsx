import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface LinkPickerOption {
  id: string;
  label: string;
}

interface LinkPickerProps {
  triggerLabel: string;
  emptyLabel: string;
  createLabel: (query: string) => string;
  options: LinkPickerOption[];
  value: LinkPickerOption | null;
  onChange: (option: LinkPickerOption | null) => void;
  onCreate: (name: string) => LinkPickerOption;
  initialQuery?: string;
  chipIcon?: React.ElementType;
}

const LinkPicker = ({
  triggerLabel,
  emptyLabel,
  createLabel,
  options,
  value,
  onChange,
  onCreate,
  initialQuery,
  chipIcon: ChipIcon = Plus,
}: LinkPickerProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  if (value) {
    return (
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label={`Remove link to ${value.label}`}
        className="inline-flex items-center gap-1.5 max-w-full text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1 hover:bg-muted transition-colors"
      >
        <ChipIcon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{value.label}</span>
        <X className="w-3 h-3 flex-shrink-0 opacity-60" />
      </button>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery(initialQuery ?? '');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs rounded-full border border-dashed border-border px-2.5 py-1 text-muted-foreground hover:bg-muted transition-colors"
        >
          <Plus className="w-3 h-3" /> {triggerLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 bg-popover z-50" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Search or type a name..." value={query} onValueChange={setQuery} />
          <CommandList>
            {options.length === 0 && !query.trim() && (
              <div className="px-3 py-4 text-xs text-muted-foreground">{emptyLabel}</div>
            )}
            <CommandEmpty className="px-3 py-2 text-xs text-muted-foreground">
              Nothing matches yet
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {query.trim() && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={() => {
                    const created = onCreate(query.trim());
                    onChange(created);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  {createLabel(query.trim())}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default LinkPicker;
