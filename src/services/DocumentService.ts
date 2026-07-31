import { HouseholdDocument, DocumentType } from '@/types/document';

const STORAGE_KEY = 'billvie_documents';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const DocumentService = {
  // Raw getter — includes soft-deleted documents. Every read-modify-write cycle
  // must use this, never getAll(), or soft-deleted items would be erased on the
  // next write.
  getRaw(): HouseholdDocument[] {
    const data = localStorage.getItem(STORAGE_KEY);
    const docs: HouseholdDocument[] = data ? JSON.parse(data) : [];

    // Self-cleaning: purge anything deleted more than 30 days ago
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const kept = docs.filter(d => !d.deletedAt || new Date(d.deletedAt).getTime() > cutoff);
    if (kept.length !== docs.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    }

    return kept;
  },

  getAll(): HouseholdDocument[] {
    return this.getRaw().filter(d => !d.deletedAt);
  },

  save(docs: HouseholdDocument[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch {
      throw new Error('STORAGE_FULL');
    }
  },


  add(doc: Omit<HouseholdDocument, 'id' | 'createdAt' | 'updatedAt'>): HouseholdDocument {
    const docs = this.getRaw();
    const newDoc: HouseholdDocument = {
      ...doc,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    docs.push(newDoc);
    this.save(docs);
    return newDoc;
  },

  update(id: string, updates: Partial<HouseholdDocument>) {
    const docs = this.getRaw();
    const idx = docs.findIndex(d => d.id === id);
    if (idx !== -1) {
      docs[idx] = { ...docs[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save(docs);
    }
  },

  // Soft delete — recoverable from Recently Deleted for 30 days
  delete(id: string) {
    const docs = this.getRaw();
    const idx = docs.findIndex(d => d.id === id);
    if (idx === -1) return;
    docs[idx] = { ...docs[idx], deletedAt: new Date().toISOString() };
    this.save(docs);
  },

  getDeleted(): HouseholdDocument[] {
    return this.getRaw().filter(d => !!d.deletedAt);
  },

  restore(id: string) {
    const docs = this.getRaw();
    const idx = docs.findIndex(d => d.id === id);
    if (idx === -1) return;
    docs[idx] = { ...docs[idx], deletedAt: undefined };
    this.save(docs);
  },

  permanentlyDelete(id: string) {
    this.save(this.getRaw().filter(d => d.id !== id));
  },

  getRecent(count = 3): HouseholdDocument[] {

    return this.getAll()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, count);
  },

  getCount(): number {
    return this.getAll().length;
  },
};
