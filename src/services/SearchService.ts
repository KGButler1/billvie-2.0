import { BillService } from '@/services/BillService';
import { DocumentService } from '@/services/DocumentService';
import { EventService } from '@/services/EventService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { PeopleService } from '@/services/PeopleService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { PaymentCardService } from '@/services/PaymentCardService';
import { CATEGORY_KEYWORDS } from '@/utils/billCategorizer';
import { CATEGORY_LABELS, BillCategory } from '@/types/bill';
import { DOCUMENT_TYPE_LABELS } from '@/types/document';

export type SearchResultType =
  | 'bill'
  | 'document'
  | 'event'
  | 'key_person'
  | 'person'
  | 'financial';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  path: string;
  score: number;
  matchedVia?: string; // set when the hit came from a synonym, not the literal text
}

export const RESULT_TYPE_LABELS: Record<SearchResultType, string> = {
  bill: 'Bills',
  document: 'Documents',
  event: 'Events',
  key_person: 'Key contacts',
  person: 'People',
  financial: 'Financial snapshot',
};

// Reuse the categoriser's synonym table so "power" finds the electricity bill.
const synonymCategories = (query: string): BillCategory[] => {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return (Object.entries(CATEGORY_KEYWORDS) as [BillCategory, string[]][])
    .filter(([, keywords]) => keywords.some((k) => k.includes(q) || q.includes(k)))
    .map(([category]) => category);
};

const scoreText = (query: string, ...fields: (string | undefined)[]): number => {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  let best = 0;
  fields.forEach((field, i) => {
    if (!field) return;
    const value = field.toLowerCase();
    const weight = i === 0 ? 1 : 0.6; // first field is the title
    if (value === q) best = Math.max(best, 100 * weight);
    else if (value.startsWith(q)) best = Math.max(best, 80 * weight);
    else if (value.includes(q)) best = Math.max(best, 60 * weight);
  });
  return best;
};

export const SearchService = {
  search(query: string, limit = 30): SearchResult[] {
    const q = query.trim();
    if (q.length < 2) return [];

    const results: SearchResult[] = [];
    const categories = synonymCategories(q);

    // Payment cards — searching a card nickname surfaces every bill on it.
    const matchingCardIds = new Map<string, string>();
    PaymentCardService.getRaw().forEach((card) => {
      if (scoreText(q, card.nickname)) matchingCardIds.set(card.id, card.nickname);
    });

    // Bills
    BillService.getAllBills().forEach((bill) => {
      let score = scoreText(q, bill.name, bill.notes);
      let matchedVia: string | undefined;
      if (!score && bill.paymentCardId && matchingCardIds.has(bill.paymentCardId)) {
        score = 50;
        matchedVia = matchingCardIds.get(bill.paymentCardId);
      }
      if (!score && bill.category && categories.includes(bill.category as BillCategory)) {
        score = 40;
        matchedVia = CATEGORY_LABELS[bill.category as BillCategory] || String(bill.category);
      }
      if (score) {
        results.push({
          id: bill.id,
          type: 'bill',
          title: bill.name,
          subtitle: bill.amount !== undefined ? `$${bill.amount.toFixed(2)}` : undefined,
          path: '/bills',
          score,
          matchedVia,
        });
      }
    });

    // Documents
    DocumentService.getAll().forEach((doc) => {
      const score = scoreText(q, doc.title, doc.provider, doc.keyDetail, doc.notes, doc.physicalLocation);
      if (score) {
        results.push({
          id: doc.id,
          type: 'document',
          title: doc.title,
          subtitle: [DOCUMENT_TYPE_LABELS[doc.type], doc.provider].filter(Boolean).join(' · '),
          path: '/documents',
          score,
        });
      }
    });

    // Events
    EventService.getAllEvents().forEach((event) => {
      const score = scoreText(q, event.name);
      if (score) {
        results.push({
          id: event.id,
          type: 'event',
          title: event.name,
          subtitle: event.status,
          path: `/events/${event.id}`,
          score,
        });
      }
    });

    // Key contacts
    KeyPeopleService.getAllKeyPeople().forEach((person) => {
      const score = scoreText(q, person.name, person.role, person.notes, person.email, person.phone);
      if (score) {
        results.push({
          id: person.id,
          type: 'key_person',
          title: person.name,
          subtitle: person.role,
          path: '/key-people',
          score,
        });
      }
    });

    // Trusted people
    PeopleService.getAll()
      .filter((p) => p.status !== 'removed')
      .forEach((person) => {
        const score = scoreText(q, person.name, person.email);
        if (score) {
          results.push({
            id: person.id,
            type: 'person',
            title: person.name,
            subtitle: person.email,
            path: '/people',
            score,
          });
        }
      });

    // Financial snapshot
    const financialEntries: { title: string; subtitle?: string }[] = [
      ...FinancialInfoService.getInsurance().map((e) => ({ title: e.provider, subtitle: 'Insurance' })),
      ...FinancialInfoService.getSuperannuation().map((e) => ({ title: e.fundName, subtitle: 'Savings & Retirement' })),
      ...FinancialInfoService.getIncome().map((e) => ({ title: e.sourceName, subtitle: 'Income' })),
      ...FinancialInfoService.getDebts().map((e) => ({ title: e.owedTo, subtitle: 'Debt' })),

    ];
    financialEntries.forEach((entry, i) => {
      const score = scoreText(q, entry.title, entry.subtitle);
      if (score) {
        results.push({
          id: `fin-${i}`,
          type: 'financial',
          title: entry.title,
          subtitle: entry.subtitle,
          path: '/financial',
          score,
        });
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  },
};
