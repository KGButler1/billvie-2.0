import { TaxTag, TaxItemType } from '@/types/taxTag';
import { BillService } from '@/services/BillService';
import { DocumentService } from '@/services/DocumentService';
import { Bill } from '@/types/bill';
import { HouseholdDocument } from '@/types/document';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

const now = () => new Date().toISOString();

function rowToTag(row: Record<string, unknown>): TaxTag {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    itemType: row.item_type as TaxItemType,
    taxYear: row.tax_year as number,
    categories: (row.categories as string[]) || undefined,
    taxType: (row.tax_type as 'personal' | 'business') || undefined,
    businessName: (row.business_name as string) || undefined,
    origin: (row.origin as 'direct' | 'carried') || 'direct',
    carriedFromYear: (row.carried_from_year as number) || undefined,
    taggedAt: row.tagged_at as string,
    untaggedAt: (row.untagged_at as string) || undefined,
  };
}

let cache: TaxTag[] = [];
let loaded = false;

const resolveItem = (itemId: string, itemType: TaxItemType) =>
  itemType === 'bill'
    ? BillService.getBillById(itemId)
    : DocumentService.getAll().find((d) => d.id === itemId);

export const TaxTagService = {
  async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('tax_tags')
      .select('*')
      .eq('household_id', householdId)
      .order('tagged_at', { ascending: false });

    if (error) throw error;
    cache = (data || []).map(rowToTag);
    loaded = true;
  },

  getRawTags(): TaxTag[] {
    return loaded ? cache : [];
  },

  getActiveTags(taxYear?: number): TaxTag[] {
    return this.getRawTags().filter((t) => !t.untaggedAt && (taxYear === undefined || t.taxYear === taxYear));
  },

  getTagForItem(itemId: string, itemType: TaxItemType, taxYear: number): TaxTag | undefined {
    return this.getActiveTags(taxYear).find((t) => t.itemId === itemId && t.itemType === itemType);
  },

  isTagged(itemId: string, itemType: TaxItemType, taxYear: number): boolean {
    return !!this.getTagForItem(itemId, itemType, taxYear);
  },

  async tagItem(
    itemId: string,
    itemType: TaxItemType,
    taxYear: number,
    details?: { categories?: string[]; taxType?: 'personal' | 'business'; businessName?: string }
  ): Promise<TaxTag> {
    const householdId = await getHouseholdId();

    // Reactivate or update existing record for same item + year
    const existing = cache.find(
      (t) => t.itemId === itemId && t.itemType === itemType && t.taxYear === taxYear
    );

    if (existing) {
      const row: Record<string, unknown> = {
        untagged_at: null,
        categories: details?.categories ?? existing.categories ?? [],
        tax_type: details?.taxType ?? existing.taxType ?? null,
        business_name: details?.businessName ?? existing.businessName ?? null,
        updated_at: now(),
      };
      const { data, error } = await supabase
        .from('tax_tags')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      const updated = rowToTag(data);
      const idx = cache.findIndex((t) => t.id === existing.id);
      if (idx !== -1) cache[idx] = updated;
      return updated;
    }

    const row = {
      household_id: householdId,
      item_id: itemId,
      item_type: itemType,
      tax_year: taxYear,
      categories: details?.categories ?? [],
      tax_type: details?.taxType ?? null,
      business_name: details?.businessName ?? null,
      origin: 'direct',
    };
    const { data, error } = await supabase
      .from('tax_tags')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const created = rowToTag(data);
    cache.push(created);
    return created;
  },

  async untagItem(itemId: string, itemType: TaxItemType, taxYear: number): Promise<void> {
    const tag = cache.find(
      (t) => t.itemId === itemId && t.itemType === itemType && t.taxYear === taxYear && !t.untaggedAt
    );
    if (!tag) return;

    const { error } = await supabase
      .from('tax_tags')
      .update({ untagged_at: now() })
      .eq('id', tag.id);
    if (error) throw error;
    const idx = cache.findIndex((t) => t.id === tag.id);
    if (idx !== -1) cache[idx] = { ...cache[idx], untaggedAt: now() };
  },

  async carryForwardIfNeeded(taxYear: number): Promise<void> {
    if (this.getActiveTags(taxYear).length > 0) return;

    const priorYears: number[] = Array.from(
      new Set<number>(this.getActiveTags().map((t) => t.taxYear).filter((y) => y < taxYear))
    ).sort((a, b) => b - a);

    const source = priorYears[0];
    if (source === undefined) return;

    const householdId = await getHouseholdId();
    const sourceTags = this.getActiveTags(source);

    for (const prev of sourceTags) {
      if (!resolveItem(prev.itemId, prev.itemType)) continue;
      const row = {
        household_id: householdId,
        item_id: prev.itemId,
        item_type: prev.itemType,
        tax_year: taxYear,
        categories: prev.categories ?? [],
        tax_type: prev.taxType ?? null,
        business_name: prev.businessName ?? null,
        origin: 'carried',
        carried_from_year: source,
      };
      const { data, error } = await supabase
        .from('tax_tags')
        .insert(row)
        .select()
        .single();
      if (!error && data) {
        cache.push(rowToTag(data));
      }
    }
  },

  // Convenience for the bill/document forms: reconciles a single checkbox +
  // year into tags, clearing any stale tag on a different year for that item.
  async setTag(
    itemId: string,
    itemType: TaxItemType,
    value: { enabled: boolean; taxYear: number; taxType?: 'personal' | 'business'; businessName?: string }
  ): Promise<void> {
    const stale = this.getActiveTags()
      .filter((t) => t.itemId === itemId && t.itemType === itemType)
      .filter((t) => !value.enabled || t.taxYear !== value.taxYear);

    for (const t of stale) {
      await this.untagItem(t.itemId, t.itemType, t.taxYear);
    }

    if (value.enabled) {
      await this.tagItem(itemId, itemType, value.taxYear, {
        taxType: value.taxType,
        businessName: value.taxType === 'business' ? value.businessName : undefined,
      });
    }
  },

  getResolvedItemsForYear(taxYear: number): { item: Bill | HouseholdDocument; tag: TaxTag }[] {
    return this.getActiveTags(taxYear)
      .map((tag) => ({ item: resolveItem(tag.itemId, tag.itemType), tag }))
      .filter((r): r is { item: Bill | HouseholdDocument; tag: TaxTag } => !!r.item);
  },

  getYearsWithTags(): number[] {
    return Array.from(new Set<number>(this.getActiveTags().map((t) => t.taxYear))).sort((a, b) => b - a);
  },
};
