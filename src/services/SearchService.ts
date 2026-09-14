import { BillService } from '@/services/BillService';
import { DocumentService } from '@/services/DocumentService';
import { EventService } from '@/services/EventService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { PeopleService } from '@/services/PeopleService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { PaymentCardService } from '@/services/PaymentCardService';
import { BankAccountService } from '@/services/BankAccountService';
import { CATEGORY_KEYWORDS } from '@/utils/billCategorizer';
import { CATEGORY_LABELS, BillCategory } from '@/types/bill';
import { DOCUMENT_TYPE_LABELS } from '@/types/document';
import { formatCurrency } from '@/utils/currency';

export type SearchResultType =
  | 'bill'
  | 'document'
  | 'event'
  | 'key_person'
  | 'person'
  | 'financial'
  | 'payment_method';

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
  payment_method: 'Payment sources',
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

    // Bank accounts — mirror the card matching for nickname and institution.
    const matchingAccountIds = new Map<string, string>();
    BankAccountService.getRaw().forEach((account) => {
      const score = scoreText(q, account.nickname, account.institution);
      if (score) matchingAccountIds.set(account.id, account.nickname);
    });

    // Payment method results — a card or account matching the query becomes a
    // result in its own right, subtitled from linkedSummary().
    PaymentCardService.getAll().forEach((card) => {
      const score = scoreText(q, card.nickname);
      if (score) {
        const summary = PaymentCardService.linkedSummary(card.id);
        results.push({
          id: `card-${card.id}`,
          type: 'payment_method',
          title: card.nickname,
          subtitle: summary ? summary.split('.')[0] : 'Payment card',
          path: `/bills?paidFrom=card:${card.id}`,
          score,
        });
      }
    });
    BankAccountService.getAll().forEach((account) => {
      const score = scoreText(q, account.nickname, account.institution);
      if (score) {
        const summary = BankAccountService.linkedSummary(account.id);
        results.push({
          id: `account-${account.id}`,
          type: 'payment_method',
          title: account.nickname,
          subtitle: summary ? summary.split('.')[0] : 'Bank account',
          path: `/bills?paidFrom=account:${account.id}`,
          score,
        });
      }
    });

    // Bills
    BillService.getAllBills().forEach((bill) => {
      let score = scoreText(q, bill.name, bill.notes);
      let matchedVia: string | undefined;
      if (!score && bill.paymentCardId && matchingCardIds.has(bill.paymentCardId)) {
        score = 50;
        matchedVia = matchingCardIds.get(bill.paymentCardId);
      }
      if (!score && bill.bankAccountId && matchingAccountIds.has(bill.bankAccountId)) {
        score = 50;
        matchedVia = matchingAccountIds.get(bill.bankAccountId);
      }
      if (!score && bill.category && categories.includes(bill.category as BillCategory)) {
        score = 40;
        matchedVia = CATEGORY_LABELS[bill.category as BillCategory] || String(bill.category);
      }
      if (score) {
        const billPath = bill.paymentCardId
          ? `/bills?paidFrom=card:${bill.paymentCardId}`
          : bill.bankAccountId
            ? `/bills?paidFrom=account:${bill.bankAccountId}`
            : '/bills';
        results.push({
          id: bill.id,
          type: 'bill',
          title: bill.name,
          subtitle: bill.amount !== undefined ? formatCurrency(bill.amount) : undefined,
          path: billPath,
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

    // Financial snapshot — also match by linked card/account name
    const financialEntries: { title: string; subtitle?: string; cardId?: string; accountId?: string }[] = [
      ...FinancialInfoService.getInsurance().map((e) => ({ title: e.provider, subtitle: 'Insurance' })),
      ...FinancialInfoService.getSuperannuation().map((e) => ({ title: e.fundName, subtitle: 'Savings & Retirement', accountId: e.linkedBankAccountId })),
      ...FinancialInfoService.getIncome().map((e) => ({ title: e.sourceName, subtitle: 'Income', accountId: e.linkedBankAccountId })),
      ...FinancialInfoService.getDebts().map((e) => ({ title: e.owedTo, subtitle: 'Debt', cardId: e.linkedPaymentCardId, accountId: e.linkedBankAccountId })),
    ];
    financialEntries.forEach((entry, i) => {
      let score = scoreText(q, entry.title, entry.subtitle);
      let matchedVia: string | undefined;
      if (!score && entry.cardId && matchingCardIds.has(entry.cardId)) {
        score = 50;
        matchedVia = matchingCardIds.get(entry.cardId);
      }
      if (!score && entry.accountId && matchingAccountIds.has(entry.accountId)) {
        score = 50;
        matchedVia = matchingAccountIds.get(entry.accountId);
      }
      if (score) {
        results.push({
          id: `fin-${i}`,
          type: 'financial',
          title: entry.title,
          subtitle: entry.subtitle,
          path: '/financial',
          score,
          matchedVia,
        });
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  },
};
