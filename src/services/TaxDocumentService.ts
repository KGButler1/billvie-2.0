import { TaxDocument, TaxCategory } from '@/types/sharing';

const STORAGE_KEY = 'billvie_tax_documents';

const generateId = (): string => {
  return `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export class TaxDocumentService {
  // Get all tax documents
  static getAllDocuments(): TaxDocument[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Get documents by year
  static getDocumentsByYear(year: number): TaxDocument[] {
    return this.getAllDocuments().filter(d => d.year === year);
  }

  // Get documents by category
  static getDocumentsByCategory(category: TaxCategory): TaxDocument[] {
    return this.getAllDocuments().filter(d => d.category === category);
  }

  // Get tax-relevant documents only
  static getTaxRelevantDocuments(): TaxDocument[] {
    return this.getAllDocuments().filter(d => d.isTaxRelevant);
  }

  // Create a new document
  static createDocument(
    data: Omit<TaxDocument, 'id' | 'createdAt' | 'updatedAt'>
  ): TaxDocument {
    const now = new Date().toISOString();
    const document: TaxDocument = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    const documents = this.getAllDocuments();
    documents.push(document);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));

    return document;
  }

  // Update a document
  static updateDocument(id: string, updates: Partial<TaxDocument>): TaxDocument | undefined {
    const documents = this.getAllDocuments();
    const index = documents.findIndex(d => d.id === id);
    if (index === -1) return undefined;

    documents[index] = {
      ...documents[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    return documents[index];
  }

  // Delete a document
  static deleteDocument(id: string): boolean {
    const documents = this.getAllDocuments();
    const filtered = documents.filter(d => d.id !== id);
    
    if (filtered.length === documents.length) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  // Get available years from documents
  static getAvailableYears(): number[] {
    const documents = this.getAllDocuments();
    const years = [...new Set(documents.map(d => d.year))];
    return years.sort((a, b) => b - a);
  }

  // Get summary by category for a year
  static getCategorySummary(year: number): Record<TaxCategory, { count: number; total: number }> {
    const documents = this.getDocumentsByYear(year);
    const summary: Record<TaxCategory, { count: number; total: number }> = {
      charity: { count: 0, total: 0 },
      medical: { count: 0, total: 0 },
      work_expenses: { count: 0, total: 0 },
      education: { count: 0, total: 0 },
      other: { count: 0, total: 0 },
    };

    documents.forEach(doc => {
      summary[doc.category].count++;
      summary[doc.category].total += doc.amount || 0;
    });

    return summary;
  }

  // Search documents
  static searchDocuments(query: string): TaxDocument[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllDocuments().filter(d =>
      d.name.toLowerCase().includes(lowerQuery) ||
      d.notes?.toLowerCase().includes(lowerQuery)
    );
  }

  // Clear all
  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Inject sample documents
  static injectSampleDocuments(): void {
    const currentYear = new Date().getFullYear();
    const samples: TaxDocument[] = [
      {
        id: 'tax_sample_1',
        name: 'Red Cross Donation',
        category: 'charity',
        year: currentYear,
        amount: 500,
        notes: 'Annual donation receipt',
        isTaxRelevant: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tax_sample_2',
        name: 'Conference Registration',
        category: 'work_expenses',
        year: currentYear,
        amount: 250,
        notes: 'Tech conference for work',
        isTaxRelevant: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tax_sample_3',
        name: 'Medical Checkup',
        category: 'medical',
        year: currentYear,
        amount: 150,
        notes: 'Annual physical',
        isTaxRelevant: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
  }
}
