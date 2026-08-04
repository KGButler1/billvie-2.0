import { TaxTag, TaxItemType } from '@/types/taxTag';
import { BillService } from '@/services/BillService';
import { DocumentService } from '@/services/DocumentService';
import { Bill } from '@/types/bill';
import { HouseholdDocument } from '@/types/document';

const TAGS_KEY = 'billvie_tax_tags';

const now = () => new Date().toISOString();
const newId = () => `tt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const readTags = (): TaxTag[] => {
  const data = localStorage.getItem(TAGS_KEY);
  return data ? JSON.parse(data) : [];
};

const writeTags = (tags: TaxTag[]) => {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
};

const resolveItem = (itemId: string, itemType: TaxItemType) =>
  itemType === 'bill'
    ? BillService.getBillById(itemId)
    : DocumentService.getAll().find((d) => d.id === itemId);

export const TaxTagService = {
  getRawTags(): TaxTag[] {
    return readTags();
  },

  getActiveTags(taxYear?: number): TaxTag[] {
    return readTags().filter((t) => !t.untaggedAt && (taxYear === undefined || t.taxYear === taxYear));
  },

  getTagForItem(itemId: string, itemType: TaxItemType, taxYear: number): TaxTag | undefined {
    return this.getActiveTags(taxYear).find((t) => t.itemId === itemId && t.itemType === itemType);
  },

  isTagged(itemId: string, itemType: TaxItemType, taxYear: number): boolean {
    return !!this.getTagForItem(itemId, itemType, taxYear);
  },

  tagItem(
    itemId: string,
    itemType: TaxItemType,
    taxYear: number,
    details?: { categories?: string[]; taxType?: 'personal' | 'business'; businessName?: string }
  ): TaxTag {
    const tags = readTags();

    // Reactivate (or update) any record for the same item + year, active or not.
    const idx = tags.findIndex((t) => t.itemId === itemId && t.itemType === itemType && t.taxYear === taxYear);
    if (idx !== -1) {
      const updated: TaxTag = {
        ...tags[idx],
        untaggedAt: undefined,
        categories: details?.categories ?? tags[idx].categories,
        taxType: details?.taxType ?? tags[idx].taxType,
        businessName: details?.businessName ?? tags[idx].businessName,
      };
      tags[idx] = updated;
      writeTags(tags);
      return updated;
    }

    const created: TaxTag = {
      id: newId(),
      itemId,
      itemType,
      taxYear,
      categories: details?.categories,
      taxType: details?.taxType,
      businessName: details?.businessName,
      origin: 'direct',
      taggedAt: now(),
    };
    tags.push(created);
    writeTags(tags);
    return created;
  },

  untagItem(itemId: string, itemType: TaxItemType, taxYear: number): void {
    const tags = readTags();
    const idx = tags.findIndex(
      (t) => t.itemId === itemId && t.itemType === itemType && t.taxYear === taxYear && !t.untaggedAt
    );
    if (idx === -1) return;
    tags[idx] = { ...tags[idx], untaggedAt: now() };
    writeTags(tags);
  },

  // Only ever runs for a year that has no active tags yet. Copies the most
  // recent prior year's tags forward so nobody has to re-tag from scratch.
  carryForwardIfNeeded(taxYear: number): void {
    if (this.getActiveTags(taxYear).length > 0) return;

    const priorYears = Array.from(
      new Set(this.getActiveTags().map((t) => t.taxYear).filter((y) => y < taxYear))
    ).sort((a, b) => b - a);

    const source = priorYears[0];
    if (source === undefined) return;

    const tags = readTags();
    let changed = false;

    this.getActiveTags(source).forEach((prev) => {
      if (!resolveItem(prev.itemId, prev.itemType)) return; // underlying record is gone
      tags.push({
        id: newId(),
        itemId: prev.itemId,
        itemType: prev.itemType,
        taxYear,
        categories: prev.categories,
        taxType: prev.taxType,
        businessName: prev.businessName,
        origin: 'carried',
        carriedFromYear: source,
        taggedAt: now(),
      });
      changed = true;
    });

    if (changed) writeTags(tags);
  },

  getResolvedItemsForYear(taxYear: number): { item: Bill | HouseholdDocument; tag: TaxTag }[] {
    return this.getActiveTags(taxYear)
      .map((tag) => ({ item: resolveItem(tag.itemId, tag.itemType), tag }))
      .filter((r): r is { item: Bill | HouseholdDocument; tag: TaxTag } => !!r.item);
  },

  getYearsWithTags(): number[] {
    return Array.from(new Set(this.getActiveTags().map((t) => t.taxYear))).sort((a, b) => b - a);
  },
};
