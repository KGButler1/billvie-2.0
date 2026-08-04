// Tax relevance is modelled as a join record, exactly like AccessGrant and
// DocumentLink. Bills and HouseholdDocuments are never modified to carry tax
// state — a TaxTag simply points at one of them for a given tax year.

export type TaxItemType = 'bill' | 'document';
export type TaxTagOrigin = 'direct' | 'carried';

export interface TaxTag {
  id: string;
  itemId: string; // a Bill id or HouseholdDocument id
  itemType: TaxItemType;
  taxYear: number; // same meaning/format as TaxDocument.year
  categories?: string[]; // reuses TaxDocumentService.getCategories() ids
  taxType?: 'personal' | 'business';
  businessName?: string;
  origin: TaxTagOrigin;
  carriedFromYear?: number; // set when origin === 'carried'
  taggedAt: string;
  untaggedAt?: string; // never delete — mirrors AccessGrant.revokedAt
}
