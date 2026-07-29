import { TaxDocument, TaxCategory, CustomTaxCategory, DEFAULT_TAX_CATEGORIES, TAX_CATEGORY_LABELS, TAX_CATEGORY_ICONS } from '@/types/sharing';

const STORAGE_KEY = 'billvie_tax_documents';
const CATEGORIES_KEY = 'billvie_tax_categories';
const CUSTOM_YEARS_KEY = 'billvie_tax_custom_years';

const generateId = (): string => {
  return `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export class TaxDocumentService {
  // ============ DOCUMENT METHODS ============

  // Raw getter — includes soft-deleted documents. All read-modify-write cycles
  // must use this, never getAllDocuments().
  private static getRawDocuments(): TaxDocument[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const documents: TaxDocument[] = JSON.parse(data);
    
    // Migrate old documents with single 'category' to 'categories' array
    let needsMigration = false;
    const migrated = documents.map(doc => {
      if ('category' in doc && !('categories' in doc)) {
        needsMigration = true;
        const { category, ...rest } = doc as any;
        return { ...rest, categories: [category] };
      }
      return doc;
    });
    
    // Self-cleaning: purge anything deleted more than 30 days ago
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const kept = migrated.filter(d => !d.deletedAt || new Date(d.deletedAt).getTime() > cutoff);

    if (needsMigration || kept.length !== migrated.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    }

    return kept;
  }

  // Get all tax documents (excludes soft-deleted)
  static getAllDocuments(): TaxDocument[] {
    return this.getRawDocuments().filter(d => !d.deletedAt);
  }

  // Get documents by year
  static getDocumentsByYear(year: number): TaxDocument[] {
    return this.getAllDocuments().filter(d => d.year === year);
  }

  // Get documents by category (matches any document containing the category)
  static getDocumentsByCategory(category: TaxCategory): TaxDocument[] {
    return this.getAllDocuments().filter(d => d.categories.includes(category));
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

    const documents = this.getRawDocuments();
    documents.push(document);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));

    return document;
  }

  // Update a document
  static updateDocument(id: string, updates: Partial<TaxDocument>): TaxDocument | undefined {
    const documents = this.getRawDocuments();
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

  // Soft-delete a document (recoverable for 30 days)
  static deleteDocument(id: string): boolean {
    const documents = this.getRawDocuments();
    const index = documents.findIndex(d => d.id === id);

    if (index === -1) return false;

    documents[index] = { ...documents[index], deletedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    return true;
  }

  static getDeletedDocuments(): TaxDocument[] {
    return this.getRawDocuments().filter(d => !!d.deletedAt);
  }

  static restoreDocument(id: string): boolean {
    const documents = this.getRawDocuments();
    const index = documents.findIndex(d => d.id === id);

    if (index === -1) return false;

    documents[index] = { ...documents[index], deletedAt: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    return true;
  }

  static permanentlyDeleteDocument(id: string): void {
    const documents = this.getRawDocuments().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }

  // Get available years from documents + custom years
  static getAvailableYears(): number[] {
    const documents = this.getAllDocuments();
    const docYears = documents.map(d => d.year);
    const customYears = this.getCustomYears();
    const currentYear = new Date().getFullYear();
    const defaultYears = [currentYear, currentYear - 1, currentYear - 2];
    
    const allYears = [...new Set([...docYears, ...customYears, ...defaultYears])];
    return allYears.sort((a, b) => b - a);
  }

  // Get summary by category for a year
  static getCategorySummary(year: number): Record<string, { count: number; total: number }> {
    const documents = this.getDocumentsByYear(year);
    const allCategories = this.getCategories();
    
    const summary: Record<string, { count: number; total: number }> = {};
    
    // Initialize all categories
    allCategories.forEach(cat => {
      summary[cat.id] = { count: 0, total: 0 };
    });

    documents.forEach(doc => {
      doc.categories.forEach(catId => {
        if (!summary[catId]) {
          summary[catId] = { count: 0, total: 0 };
        }
        summary[catId].count++;
        summary[catId].total += doc.amount || 0;
      });
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
        categories: ['charity'],
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
        categories: ['work_expenses', 'education'],
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
        categories: ['medical'],
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

  // ============ CATEGORY MANAGEMENT ============

  // Get all categories (default + custom)
  static getCategories(): CustomTaxCategory[] {
    // Default categories
    const defaults: CustomTaxCategory[] = DEFAULT_TAX_CATEGORIES.map(id => ({
      id,
      label: TAX_CATEGORY_LABELS[id],
      icon: TAX_CATEGORY_ICONS[id],
      isDefault: true,
    }));

    // Custom categories
    const customData = localStorage.getItem(CATEGORIES_KEY);
    const customs: CustomTaxCategory[] = customData ? JSON.parse(customData) : [];

    return [...defaults, ...customs];
  }

  // Get category by ID
  static getCategoryById(id: string): CustomTaxCategory | undefined {
    return this.getCategories().find(c => c.id === id);
  }

  // Add custom category
  static addCategory(label: string, icon: string = '📁'): CustomTaxCategory {
    const customData = localStorage.getItem(CATEGORIES_KEY);
    const customs: CustomTaxCategory[] = customData ? JSON.parse(customData) : [];
    
    const newCategory: CustomTaxCategory = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      label,
      icon,
      isDefault: false,
    };

    customs.push(newCategory);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(customs));
    
    return newCategory;
  }

  // Update custom category
  static updateCategory(id: string, updates: { label?: string; icon?: string }): boolean {
    const customData = localStorage.getItem(CATEGORIES_KEY);
    const customs: CustomTaxCategory[] = customData ? JSON.parse(customData) : [];
    
    const index = customs.findIndex(c => c.id === id);
    if (index === -1) return false;

    customs[index] = { ...customs[index], ...updates };
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(customs));
    
    return true;
  }

  // Delete custom category
  static deleteCategory(id: string): { success: boolean; documentsAffected: number } {
    // Check if any documents use this category
    const documents = this.getAllDocuments();
    const affectedDocs = documents.filter(d => d.categories.includes(id));
    
    if (affectedDocs.length > 0) {
      // Remove category from affected documents
      affectedDocs.forEach(doc => {
        const newCategories = doc.categories.filter(c => c !== id);
        // Ensure at least one category remains
        if (newCategories.length === 0) {
          newCategories.push('other');
        }
        this.updateDocument(doc.id, { categories: newCategories });
      });
    }

    // Remove the custom category
    const customData = localStorage.getItem(CATEGORIES_KEY);
    const customs: CustomTaxCategory[] = customData ? JSON.parse(customData) : [];
    const filtered = customs.filter(c => c.id !== id);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered));

    return { success: true, documentsAffected: affectedDocs.length };
  }

  // ============ YEAR MANAGEMENT ============

  // Get custom years
  static getCustomYears(): number[] {
    const data = localStorage.getItem(CUSTOM_YEARS_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Add custom year
  static addCustomYear(year: number): boolean {
    const years = this.getCustomYears();
    if (years.includes(year)) return false;
    
    years.push(year);
    years.sort((a, b) => b - a);
    localStorage.setItem(CUSTOM_YEARS_KEY, JSON.stringify(years));
    
    return true;
  }

  // Remove custom year
  static removeCustomYear(year: number): { success: boolean; documentsExist: boolean } {
    // Check if any documents use this year
    const documents = this.getAllDocuments();
    const docsWithYear = documents.filter(d => d.year === year);
    
    if (docsWithYear.length > 0) {
      return { success: false, documentsExist: true };
    }

    const years = this.getCustomYears();
    const filtered = years.filter(y => y !== year);
    localStorage.setItem(CUSTOM_YEARS_KEY, JSON.stringify(filtered));
    
    return { success: true, documentsExist: false };
  }
}
