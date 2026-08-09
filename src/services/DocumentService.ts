import { HouseholdDocument, DocumentType } from '@/types/document';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';
import { isDemoModeActive } from '@/demo/demoFlag';
import { DEMO_DOCUMENTS } from '@/demo/demoData';

let demoCache: HouseholdDocument[] = DEMO_DOCUMENTS.map((d) => ({ ...d }));

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function rowToDoc(row: Record<string, unknown>): HouseholdDocument {
  return {
    id: row.id as string,
    title: row.title as string,
    provider: (row.provider as string) || '',
    type: (row.type as DocumentType) || 'other',
    keyDetail: (row.key_detail as string) || undefined,
    notes: (row.notes as string) || undefined,
    externalLink: (row.external_link as string) || undefined,
    physicalLocation: (row.physical_location as string) || undefined,
    importantDate: (row.important_date as string) || undefined,
    importantDateLabel: (row.important_date_label as string) || undefined,
    deletedAt: (row.deleted_at as string) || undefined,
    scanSourced: (row.scan_sourced as boolean) || false,
    source: (row.source as 'manual' | 'bill_scan') || 'manual',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function docToRow(doc: Partial<HouseholdDocument>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (doc.title !== undefined) row.title = doc.title;
  if (doc.provider !== undefined) row.provider = doc.provider || '';
  if (doc.type !== undefined) row.type = doc.type;
  if (doc.keyDetail !== undefined) row.key_detail = doc.keyDetail || null;
  if (doc.notes !== undefined) row.notes = doc.notes || null;
  if (doc.externalLink !== undefined) row.external_link = doc.externalLink || null;
  if (doc.physicalLocation !== undefined) row.physical_location = doc.physicalLocation || null;
  if (doc.importantDate !== undefined) row.important_date = doc.importantDate || null;
  if (doc.importantDateLabel !== undefined) row.important_date_label = doc.importantDateLabel || null;
  if (doc.deletedAt !== undefined) row.deleted_at = doc.deletedAt || null;
  if (doc.scanSourced !== undefined) row.scan_sourced = doc.scanSourced;
  if (doc.source !== undefined) row.source = doc.source;
  return row;
}

let cache: HouseholdDocument[] = [];
let loaded = false;

export const DocumentService = {
  async refresh(): Promise<void> {
    if (isDemoModeActive()) return;
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    cache = (data || []).map(rowToDoc);
    loaded = true;
  },

  ensureLoaded(): HouseholdDocument[] {
    if (isDemoModeActive()) return demoCache;
    return loaded ? cache : [];
  },

  getRaw(): HouseholdDocument[] {
    return this.ensureLoaded();
  },

  getById(id: string): HouseholdDocument | undefined {
    return this.ensureLoaded().find((d) => d.id === id);
  },

  getAll(): HouseholdDocument[] {
    return this.ensureLoaded().filter((d) => !d.deletedAt && !d.scanSourced);
  },

  getScanned(): HouseholdDocument[] {
    return this.ensureLoaded().filter((d) => !d.deletedAt && d.scanSourced);
  },

  async add(doc: Omit<HouseholdDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<HouseholdDocument> {
    const householdId = await getHouseholdId();
    const row = { ...docToRow(doc), household_id: householdId };

    const { data, error } = await supabase
      .from('documents')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    const newDoc = rowToDoc(data);
    cache.push(newDoc);
    return newDoc;
  },

  async update(id: string, updates: Partial<HouseholdDocument>): Promise<void> {
    if (isDemoModeActive()) {
      const idx = demoCache.findIndex((d) => d.id === id);
      if (idx !== -1) demoCache[idx] = { ...demoCache[idx], ...updates, updatedAt: new Date().toISOString() };
      return;
    }
    const row = { ...docToRow(updates), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('documents')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updated = rowToDoc(data);
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) cache[idx] = updated;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) cache[idx] = { ...cache[idx], deletedAt: new Date().toISOString() };
  },

  getDeleted(): HouseholdDocument[] {
    return this.ensureLoaded().filter((d) => !!d.deletedAt);
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) throw error;
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) cache[idx] = { ...cache[idx], deletedAt: undefined };
  },

  async permanentlyDelete(id: string): Promise<void> {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
    cache = cache.filter((d) => d.id !== id);
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
