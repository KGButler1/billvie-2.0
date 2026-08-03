export type DocumentLinkType = 'bill' | 'document';

export interface DocumentLink {
  id: string;
  documentId: string; // the document side always initiates the link
  linkType: DocumentLinkType;
  targetId: string; // a billId (linkType 'bill') or another document's id (linkType 'document')
  linkedAt: string;
  unlinkedAt?: string; // never delete — mirrors AccessGrant.revokedAt. History is the point.
}
