import { AccessScope } from '@/types/people';
import { AccessService } from '@/services/AccessService';
import { DocumentService } from '@/services/DocumentService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { EventService } from '@/services/EventService';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { BillService } from '@/services/BillService';

// Every item currently in a scope — used when narrowing someone from
// whole-scope access down to individual items, and when describing how
// much of a scope a person can actually see.
export const allItemIds = (scope: AccessScope): string[] => {
  switch (scope) {
    case 'documents':
      return DocumentService.getAll().map((d) => d.id);
    case 'key_people':
      return KeyPeopleService.getAllKeyPeople().map((p) => p.id);
    case 'events':
      return EventService.getAllEvents().map((e) => e.id);
    case 'tax_documents':
      return TaxDocumentService.getAllDocuments().map((d) => d.id);
    case 'bills':
      return BillService.getAllBills().map((b) => b.id);
    default:
      // financial_info is shared whole-scope only.
      return [];
  }
};

export interface ScopeAccessSummary {
  kind: 'none' | 'all' | 'partial';
  seen: number;
  total: number;
}

// Partial access must never look like full access anywhere in the UI.
export const scopeAccessSummary = (personId: string, scope: AccessScope): ScopeAccessSummary => {
  const total = allItemIds(scope).length;
  if (AccessService.hasWholeScope(personId, scope)) {
    return { kind: 'all', seen: total, total };
  }
  const ids = new Set(allItemIds(scope).filter((id) => AccessService.canSee(personId, scope, id)));
  if (ids.size === 0) return { kind: 'none', seen: 0, total };
  return { kind: 'partial', seen: ids.size, total };
};

export const scopeAccessLabel = (
  personId: string,
  scope: AccessScope,
  scopeLabelLower: string
): string | undefined => {
  const summary = scopeAccessSummary(personId, scope);
  if (summary.kind === 'all') return `Sees all your ${scopeLabelLower}`;
  if (summary.kind === 'partial')
    return `Sees ${summary.seen} of ${summary.total} ${scopeLabelLower} — new ones won't be shared automatically`;
  return undefined;
};
