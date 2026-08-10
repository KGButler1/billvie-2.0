import { DocumentLink } from '@/types/documentLink';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

const now = () => new Date().toISOString();

function rowToLink(row: Record<string, unknown>): DocumentLink {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    sourceType: (row.source_type as 'document' | 'tax_document') || 'document',
    linkType: row.link_type as 'bill' | 'document',
    targetId: row.target_id as string,
    linkedAt: row.linked_at as string,
    unlinkedAt: (row.unlinked_at as string) || undefined,
  };
}

let cache: DocumentLink[] = [];
let loaded = false;

export const DocumentLinkService = {
  isLoaded(): boolean {
    return loaded;
  },

  async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('document_links')
      .select('*')
      .eq('household_id', householdId)
      .order('linked_at', { ascending: true });

    if (error) throw error;
    cache = (data || []).map(rowToLink);
    loaded = true;
  },

  getRawLinks(): DocumentLink[] {
    return loaded ? cache : [];
  },

  getActiveLinks(): DocumentLink[] {
    return this.getRawLinks().filter((l) => !l.unlinkedAt);
  },

  sourceOf(link: DocumentLink): 'document' | 'tax_document' {
    return link.sourceType ?? 'document';
  },

  // ---- Document -> Bill ----
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

  async linkToBill(documentId: string, billId: string): Promise<DocumentLink> {
    this.getActiveLinks()
      .filter((l) => l.documentId === documentId && l.linkType === 'bill' && this.sourceOf(l) === 'document')
      .forEach((l) => this.unlink(l.id));

    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId, document_id: documentId,
      source_type: 'document', link_type: 'bill', target_id: billId,
    };
    const { data, error } = await supabase.from('document_links').insert(row).select().single();
    if (error) throw error;
    const created = rowToLink(data);
    cache.push(created);
    return created;
  },

  // ---- Document <-> Document ----
  getRelatedDocumentIds(documentId: string): string[] {
    const active = this.getActiveLinks().filter(
      (l) => l.linkType === 'document' && this.sourceOf(l) === 'document'
    );
    const forward = active.filter((l) => l.documentId === documentId).map((l) => l.targetId);
    const reverse = active.filter((l) => l.targetId === documentId).map((l) => l.documentId);
    return Array.from(new Set([...forward, ...reverse]));
  },

  async linkToDocument(documentId: string, targetDocumentId: string): Promise<DocumentLink | undefined> {
    if (documentId === targetDocumentId) return undefined;
    if (this.getRelatedDocumentIds(documentId).includes(targetDocumentId)) return undefined;

    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId, document_id: documentId,
      source_type: 'document', link_type: 'document', target_id: targetDocumentId,
    };
    const { data, error } = await supabase.from('document_links').insert(row).select().single();
    if (error) throw error;
    const created = rowToLink(data);
    cache.push(created);
    return created;
  },

  // ---- TaxDocument -> Bill / Document ----
  getLinkedBillIdForTax(taxDocumentId: string): string | undefined {
    return this.getActiveLinks().find(
      (l) => l.documentId === taxDocumentId && l.linkType === 'bill' && this.sourceOf(l) === 'tax_document'
    )?.targetId;
  },

  async linkTaxToBill(taxDocumentId: string, billId: string): Promise<DocumentLink> {
    this.getActiveLinks()
      .filter((l) => l.documentId === taxDocumentId && l.linkType === 'bill' && this.sourceOf(l) === 'tax_document')
      .forEach((l) => this.unlink(l.id));

    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId, document_id: taxDocumentId,
      source_type: 'tax_document', link_type: 'bill', target_id: billId,
    };
    const { data, error } = await supabase.from('document_links').insert(row).select().single();
    if (error) throw error;
    const created = rowToLink(data);
    cache.push(created);
    return created;
  },

  getRelatedDocumentIdsForTax(taxDocumentId: string): string[] {
    return Array.from(
      new Set(
        this.getActiveLinks()
          .filter((l) => l.linkType === 'document' && this.sourceOf(l) === 'tax_document' && l.documentId === taxDocumentId)
          .map((l) => l.targetId)
      )
    );
  },

  async linkTaxToDocument(taxDocumentId: string, documentId: string): Promise<DocumentLink | undefined> {
    if (this.getRelatedDocumentIdsForTax(taxDocumentId).includes(documentId)) return undefined;

    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId, document_id: taxDocumentId,
      source_type: 'tax_document', link_type: 'document', target_id: documentId,
    };
    const { data, error } = await supabase.from('document_links').insert(row).select().single();
    if (error) throw error;
    const created = rowToLink(data);
    cache.push(created);
    return created;
  },

  findActiveTaxLinkId(taxDocumentId: string, targetId: string): string | undefined {
    return this.getActiveLinks().find(
      (l) => this.sourceOf(l) === 'tax_document' && l.documentId === taxDocumentId && l.targetId === targetId
    )?.id;
  },

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
  async unlink(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('document_links')
      .update({ unlinked_at: now() })
      .eq('id', linkId);
    if (error) throw error;
    const idx = cache.findIndex((l) => l.id === linkId);
    if (idx !== -1) cache[idx] = { ...cache[idx], unlinkedAt: now() };
  },

  findActiveLinkId(documentId: string, targetId: string): string | undefined {
    return this.getActiveLinks()
      .filter((l) => this.sourceOf(l) === 'document')
      .find(
        (l) =>
          (l.documentId === documentId && l.targetId === targetId) ||
          (l.linkType === 'document' && l.documentId === targetId && l.targetId === documentId)
      )?.id;
  },

  getHistoryForDocument(documentId: string): DocumentLink[] {
    return this.getRawLinks()
      .filter((l) => (l.documentId === documentId || l.targetId === documentId) && l.unlinkedAt)
      .sort((a, b) => (b.unlinkedAt || '').localeCompare(a.unlinkedAt || ''));
  },
};
