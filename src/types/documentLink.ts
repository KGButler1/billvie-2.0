export type DocumentLinkType = 'bill' | 'document';

export interface DocumentLink {
  id: string;
  documentId: string; // the source item's id — a HouseholdDocument or (when sourceType is 'tax_document') a TaxDocument
  sourceType?: 'document' | 'tax_document'; // absent means 'document' — every pre-existing record
  linkType: DocumentLinkType;
  targetId: string; // a billId (linkType 'bill') or another document's id (linkType 'document')
  linkedAt: string;
  unlinkedAt?: string; // never delete — mirrors AccessGrant.revokedAt. History is the point.
}
