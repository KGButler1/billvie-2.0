import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, FileText, CalendarDays, Users, UserCircle, Wallet } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  SearchService,
  SearchResult,
  SearchResultType,
  RESULT_TYPE_LABELS,
} from '@/services/SearchService';

const ICONS: Record<SearchResultType, typeof Receipt> = {
  bill: Receipt,
  document: FileText,
  event: CalendarDays,
  key_person: Users,
  person: UserCircle,
  financial: Wallet,
};

const GROUP_ORDER: SearchResultType[] = [
  'bill',
  'document',
  'key_person',
  'person',
  'financial',
  'event',
];

interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SearchPalette = ({ open, onOpenChange }: SearchPaletteProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo(() => (open ? SearchService.search(query) : []), [query, open]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultType, SearchResult[]>();
    results.forEach((r) => {
      map.set(r.type, [...(map.get(r.type) || []), r]);
    });
    return GROUP_ORDER.filter((t) => map.has(t)).map((t) => [t, map.get(t)!] as const);
  }, [results]);

  const go = (result: SearchResult) => {
    onOpenChange(false);
    navigate(result.path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Search bills, documents, people…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length < 2 ? (
          <div className="py-6 px-4 text-sm text-muted-foreground">
            Type to find anything you've put in here.
          </div>
        ) : results.length === 0 ? (
          <div className="py-6 px-4 text-sm text-muted-foreground">
            Nothing matched "{query}". It may not be in here yet.
          </div>
        ) : (
          <>

            {grouped.map(([type, items]) => {
              const Icon = ICONS[type];
              return (
                <CommandGroup key={type} heading={RESULT_TYPE_LABELS[type]}>
                  {items.map((result) => (
                    <CommandItem
                      key={`${type}-${result.id}`}
                      value={`${result.title} ${result.subtitle || ''} ${result.id}`}
                      onSelect={() => go(result)}
                    >
                      <Icon className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                      <span className="truncate">{result.title}</span>
                      {result.subtitle && (
                        <span className="ml-2 text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </span>
                      )}
                      {result.matchedVia && (
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">
                          matched {result.matchedVia}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default SearchPalette;
