import { TaxDocument, TaxCategory, CustomTaxCategory, DEFAULT_TAX_CATEGORIES, TAX_CATEGORY_LABELS, TAX_CATEGORY_ICONS } from '@/types/sharing';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

const CATEGORIES_KEY = 'billvie_tax_categories';
const CUSTOM_YEARS_KEY = 'billvie_tax_custom_years';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function rowToDoc(row: Record<string, unknown>): TaxDocument {
  return {
    id: row.id as string,
    name: row.name as string,
    categories: (row.categories as string[]) || [],
    year: row.year as number,
    amount: row.amount != null ? Number(row.amount) : undefined,
    notes: (row.notes as string) || undefined,
    isTaxRelevant: row.is_tax_relevant as boolean,
    deletedAt: (row.deleted_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

let cache: TaxDocument[] = [];
let loaded = false;

export class TaxDocumentService {
  static async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('tax_documents')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    cache = (data || []).map(rowToDoc);
    loaded = true;
  }

  private static ensureLoaded(): TaxDocument[] {
    return loaded ? cache : [];
  }

  private static getRawDocuments(): TaxDocument[] {
    return this.ensureLoaded();
  }

  static getAllDocuments(): TaxDocument[] {
    return this.getRawDocuments().filter((d) => !d.deletedAt);
  }

  static getDocumentsByYear(year: number): TaxDocument[] {
    return this.getAllDocuments().filter((d) => d.year === year);
  }

  static getDocumentsByCategory(category: TaxCategory): TaxDocument[] {
    return this.getAllDocuments().filter((d) => d.categories.includes(category));
  }

  static getTaxRelevantDocuments(): TaxDocument[] {
    return this.getAllDocuments().filter((d) => d.isTaxRelevant);
  }

  static async createDocument(data: Omit<TaxDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaxDocument> {
    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId,
      name: data.name,
      categories: data.categories || [],
      year: data.year,
      amount: data.amount ?? null,
      notes: data.notes || null,
      is_tax_relevant: data.isTaxRelevant,
    };

    const { data: result, error } = await supabase
      .from('tax_documents')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    const newDoc = rowToDoc(result);
    cache.push(newDoc);
    return newDoc;
  }

  static async updateDocument(id: string, updates: Partial<TaxDocument>): Promise<TaxDocument | undefined> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.categories !== undefined) row.categories = updates.categories;
    if (updates.year !== undefined) row.year = updates.year;
    if (updates.amount !== undefined) row.amount = updates.amount;
    if (updates.notes !== undefined) row.notes = updates.notes || null;
    if (updates.isTaxRelevant !== undefined) row.is_tax_relevant = updates.isTaxRelevant;

    const { data, error } = await supabase
      .from('tax_documents')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updated = rowToDoc(data);
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) cache[idx] = updated;
    return updated;
  }

  static async deleteDocument(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tax_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) cache[idx] = { ...cache[idx], deletedAt: new Date().toISOString() };
    return true;
  }

  static getDeletedDocuments(): TaxDocument[] {
    return this.getRawDocuments().filter((d) => !!d.deletedAt);
  }

  static async restoreDocument(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tax_documents')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) throw error;
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) cache[idx] = { ...cache[idx], deletedAt: undefined };
    return true;
  }

  static async permanentlyDeleteDocument(id: string): Promise<void> {
    const { error } = await supabase.from('tax_documents').delete().eq('id', id);
    if (error) throw error;
    cache = cache.filter((d) => d.id !== id);
  }

  static getAvailableYears(): number[] {
    const documents = this.getAllDocuments();
    const docYears = documents.map((d) => d.year);
    const customYears = this.getCustomYears();
    const currentYear = new Date().getFullYear();
    const defaultYears = [currentYear, currentYear - 1, currentYear - 2];
    const allYears = [...new Set([...docYears, ...customYears, ...defaultYears])];
    return allYears.sort((a, b) => b - a);
  }

  static getCategorySummary(year: number): Record<string, { count: number; total: number }> {
    const documents = this.getDocumentsByYear(year);
    const allCategories = this.getCategories();
    const summary: Record<string, { count: number; total: number }> = {};
    allCategories.forEach((cat) => { summary[cat.id] = { count: 0, total: 0 }; });
    documents.forEach((doc) => {
      doc.categories.forEach((catId) => {
        if (!summary[catId]) summary[catId] = { count: 0, total: 0 };
        summary[catId].count++;
        summary[catId].total += doc.amount || 0;
      });
    });
    return summary;
  }

  static searchDocuments(query: string): TaxDocument[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllDocuments().filter((d) =>
      d.name.toLowerCase().includes(lowerQuery) ||
      d.notes?.toLowerCase().includes(lowerQuery)
    );
  }

  static async clearAll(): Promise<void> {
    const householdId = await getHouseholdId();
    const { error } = await supabase.from('tax_documents').delete().eq('household_id', householdId);
    if (error) throw error;
    cache = [];
  }

  // Category management — stays on localStorage (per-device picklist config)
  static getCategories(): CustomTaxCategory[] {
    const defaults: CustomTaxCategory[] = DEFAULT_TAX_CATEGORIES.map((id) => ({
      id, label: TAX_CATEGORY_LABELS[id], icon: TAX_CATEGORY_ICONS[id], isDefault: true,
    }));
    const customData = localStorage.getItem(CATEGORIES_KEY);
    const customs: CustomTaxCategory[] = customData ? JSON.parse(customData) : [];
    return [...defaults, ...customs];
  }

  static getCategoryById(id: string): CustomTaxCategory | undefined {
    return this.getCategories().find((c) => c.id === id);
  }

  static addCategory(label: string, icon = '📁'): CustomTaxCategory {
    const customData = localStorage.getItem(CATEGORIES_KEY);
    const customs: CustomTaxCategory[] = customData ? JSON.parse(customData) : [];
    const newCategory: CustomTaxCategory = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      label, icon, isDefault: false,
    };
    customs.push(newCategory);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(customs));
    return newCategory;
  }

  static updateCategory(id: string, updates: { label?: string; icon?: string }): boolean {
    const customData = localStorage.getItem(CATEGORIES_KEY);
    const customs: CustomTaxCategory[] = customData ? JSON.parse(customData) : [];
    const index = customs.findIndex((c) => c.id === id);
    if (index === -1) return false;
    customs[index] = { ...customs[index], ...updates };
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(customs));
    return true;
  }

  static deleteCategory(id: string): { success: boolean; documentsAffected: number } {
    const documents = this.getAllDocuments();
    const affectedDocs = documents.filter((d) => d.categories.includes(id));
    if (affectedDocs.length > 0) {
      affectedDocs.forEach((doc) => {
        const newCategories = doc.categories.filter((c) => c !== id);
        if (newCategories.length === 0) newCategories.push('other');
        this.updateDocument(doc.id, { categories: newCategories });
      });
    }
    const customData = localStorage.getItem(CATEGORIES_KEY);
    const customs: CustomTaxCategory[] = customData ? JSON.parse(customData) : [];
    const filtered = customs.filter((c) => c.id !== id);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered));
    return { success: true, documentsAffected: affectedDocs.length };
  }

  // Year management — stays on localStorage
  static getCustomYears(): number[] {
    const data = localStorage.getItem(CUSTOM_YEARS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static addCustomYear(year: number): boolean {
    const years = this.getCustomYears();
    if (years.includes(year)) return false;
    years.push(year);
    years.sort((a, b) => b - a);
    localStorage.setItem(CUSTOM_YEARS_KEY, JSON.stringify(years));
    return true;
  }

  static removeCustomYear(year: number): { success: boolean; documentsExist: boolean } {
    const documents = this.getAllDocuments();
    const docsWithYear = documents.filter((d) => d.year === year);
    if (docsWithYear.length > 0) return { success: false, documentsExist: true };
    const years = this.getCustomYears();
    const filtered = years.filter((y) => y !== year);
    localStorage.setItem(CUSTOM_YEARS_KEY, JSON.stringify(filtered));
    return { success: true, documentsExist: false };
  }
}
