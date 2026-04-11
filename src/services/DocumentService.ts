import { HouseholdDocument, DocumentType } from '@/types/document';

const STORAGE_KEY = 'billvie_documents';

export const DocumentService = {
  getAll(): HouseholdDocument[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(docs: HouseholdDocument[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  },

  add(doc: Omit<HouseholdDocument, 'id' | 'createdAt' | 'updatedAt'>): HouseholdDocument {
    const docs = this.getAll();
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
    const docs = this.getAll();
    const idx = docs.findIndex(d => d.id === id);
    if (idx !== -1) {
      docs[idx] = { ...docs[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save(docs);
    }
  },

  delete(id: string) {
    const docs = this.getAll().filter(d => d.id !== id);
    this.save(docs);
  },

  toggleAdvisor(id: string) {
    const docs = this.getAll();
    const idx = docs.findIndex(d => d.id === id);
    if (idx !== -1) {
      docs[idx].markedForAdvisor = !docs[idx].markedForAdvisor;
      docs[idx].updatedAt = new Date().toISOString();
      this.save(docs);
    }
  },

  getAdvisorItems(): HouseholdDocument[] {
    return this.getAll().filter(d => d.markedForAdvisor);
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
