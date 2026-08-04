import { DocumentLink } from '@/types/documentLink';

const LINKS_KEY = 'billvie_document_links';

const now = () => new Date().toISOString();

const readLinks = (): DocumentLink[] => {
  const data = localStorage.getItem(LINKS_KEY);
  return data ? JSON.parse(data) : [];
};

const writeLinks = (links: DocumentLink[]) => {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
};

const newId = () => `dl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const DocumentLinkService = {
  getRawLinks(): DocumentLink[] {
    return readLinks();
  },

  getActiveLinks(): DocumentLink[] {
    return readLinks().filter((l) => !l.unlinkedAt);
  },

  // Absent sourceType means 'document' — keeps every pre-existing record working.
  sourceOf(link: DocumentLink): 'document' | 'tax_document' {
    return link.sourceType ?? 'document';
  },

  // ---- Document -> Bill (one active bill-link per document) ----

  getLinkedBillId(documentId: string): string | undefined {
    return this.getActiveLinks().find(
      (l) => l.documentId === documentId && l.linkType === 'bill' && this.sourceOf(l) === 'document'
    )?.targetId;
  },

  getLinkedDocumentIdForBill(billId: string): string | undefined {
    return this.getActiveLinks().find(
      (l) => l.linkType === 'bill' && l.targetId === billId && this.sourceOf(l) === 'document'
    )?.documentId;
  },

  linkToBill(documentId: string, billId: string): DocumentLink {
    // One active bill-link per document — unlink any existing one first.
    this.getActiveLinks()
      .filter((l) => l.documentId === documentId && l.linkType === 'bill' && this.sourceOf(l) === 'document')
      .forEach((l) => this.unlink(l.id));

    const links = readLinks();
    const created: DocumentLink = {
      id: newId(),
      documentId,
      sourceType: 'document',
      linkType: 'bill',
      targetId: billId,
      linkedAt: now(),
    };
    links.push(created);
    writeLinks(links);
    return created;
  },

  // ---- Document <-> Document (many-to-many, symmetric) ----

  getRelatedDocumentIds(documentId: string): string[] {
    const active = this.getActiveLinks().filter(
      (l) => l.linkType === 'document' && this.sourceOf(l) === 'document'
    );
    const forward = active.filter((l) => l.documentId === documentId).map((l) => l.targetId);
    const reverse = active.filter((l) => l.targetId === documentId).map((l) => l.documentId);
    return Array.from(new Set([...forward, ...reverse]));
  },

  linkToDocument(documentId: string, targetDocumentId: string): DocumentLink | undefined {
    if (documentId === targetDocumentId) return undefined; // no self-links

    const already = this.getRelatedDocumentIds(documentId).includes(targetDocumentId);
    if (already) return undefined; // no duplicate pairs, either direction

    const links = readLinks();
    const created: DocumentLink = {
      id: newId(),
      documentId,
      sourceType: 'document',
      linkType: 'document',
      targetId: targetDocumentId,
      linkedAt: now(),
    };
    links.push(created);
    writeLinks(links);
    return created;
  },

  // ---- TaxDocument -> Bill / Document ----
  // Same rules as above, kept in their own sourceType namespace so a Document's
  // links and a TaxDocument's links can never cross-resolve into each other.

  getLinkedBillIdForTax(taxDocumentId: string): string | undefined {
    return this.getActiveLinks().find(
      (l) => l.documentId === taxDocumentId && l.linkType === 'bill' && this.sourceOf(l) === 'tax_document'
    )?.targetId;
  },

  linkTaxToBill(taxDocumentId: string, billId: string): DocumentLink {
    this.getActiveLinks()
      .filter(
        (l) => l.documentId === taxDocumentId && l.linkType === 'bill' && this.sourceOf(l) === 'tax_document'
      )
      .forEach((l) => this.unlink(l.id));

    const links = readLinks();
    const created: DocumentLink = {
      id: newId(),
      documentId: taxDocumentId,
      sourceType: 'tax_document',
      linkType: 'bill',
      targetId: billId,
      linkedAt: now(),
    };
    links.push(created);
    writeLinks(links);
    return created;
  },

  getRelatedDocumentIdsForTax(taxDocumentId: string): string[] {
    return Array.from(
      new Set(
        this.getActiveLinks()
          .filter(
            (l) =>
              l.linkType === 'document' &&
              this.sourceOf(l) === 'tax_document' &&
              l.documentId === taxDocumentId
          )
          .map((l) => l.targetId)
      )
    );
  },

  linkTaxToDocument(taxDocumentId: string, documentId: string): DocumentLink | undefined {
    if (this.getRelatedDocumentIdsForTax(taxDocumentId).includes(documentId)) return undefined;

    const links = readLinks();
    const created: DocumentLink = {
      id: newId(),
      documentId: taxDocumentId,
      sourceType: 'tax_document',
      linkType: 'document',
      targetId: documentId,
      linkedAt: now(),
    };
    links.push(created);
    writeLinks(links);
    return created;
  },

  findActiveTaxLinkId(taxDocumentId: string, targetId: string): string | undefined {
    return this.getActiveLinks().find(
      (l) => this.sourceOf(l) === 'tax_document' && l.documentId === taxDocumentId && l.targetId === targetId
    )?.id;
  },

  // Bills / documents can show what tax entries point at them.
  getTaxDocumentIdsForTarget(targetId: string): string[] {
    return Array.from(
      new Set(
        this.getActiveLinks()
          .filter((l) => this.sourceOf(l) === 'tax_document' && l.targetId === targetId)
          .map((l) => l.documentId)
      )
    );
  },

  // ---- Removal (never deletes) ----

  unlink(linkId: string): void {
    const links = readLinks();
    const idx = links.findIndex((l) => l.id === linkId);
    if (idx === -1 || links[idx].unlinkedAt) return;
    links[idx] = { ...links[idx], unlinkedAt: now() };
    writeLinks(links);
  },

  // Finds the active link record between a document and a specific bill or document
  // target, so the UI can pass its id to unlink().
  findActiveLinkId(documentId: string, targetId: string): string | undefined {
    return this.getActiveLinks().find(
      (l) =>
        (l.documentId === documentId && l.targetId === targetId) ||
        (l.linkType === 'document' && l.documentId === targetId && l.targetId === documentId)
    )?.id;
  },

  // ---- History (same shape as AccessService.getHistoryForPerson) ----

  getHistoryForDocument(documentId: string): DocumentLink[] {
    return readLinks()
      .filter((l) => (l.documentId === documentId || l.targetId === documentId) && l.unlinkedAt)
      .sort((a, b) => (b.unlinkedAt || '').localeCompare(a.unlinkedAt || ''));
  },
};
