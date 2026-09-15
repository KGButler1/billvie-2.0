import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';
import { isDemoModeActive } from '@/demo/demoFlag';

export type FlagItemType = 'bill' | 'document';

export interface ItemFlag {
  id: string;
  householdId: string;
  itemType: FlagItemType;
  itemId: string;
  trustedPersonId: string;
  createdBy: string;
  createdAt: string;
}

interface ItemFlagRow {
  id: string;
  household_id: string;
  item_type: string;
  item_id: string;
  trusted_person_id: string;
  created_by: string;
  created_at: string;
}

function rowToFlag(row: ItemFlagRow): ItemFlag {
  return {
    id: row.id,
    householdId: row.household_id,
    itemType: row.item_type as FlagItemType,
    itemId: row.item_id,
    trustedPersonId: row.trusted_person_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
 }

let cache: ItemFlag[] = [];
let loaded = false;

export const ItemFlagService = {
  isLoaded(): boolean {
    if (isDemoModeActive()) return true;
    return loaded;
  },

  async refresh(): Promise<void> {
    if (isDemoModeActive()) {
      cache = [];
      loaded = true;
      return;
    }
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('item_flags')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    cache = (data || []).map(rowToFlag);
    loaded = true;
  },

  getAll(): ItemFlag[] {
    return cache;
  },

  getForItem(itemType: FlagItemType, itemId: string): ItemFlag[] {
    return cache.filter((f) => f.itemType === itemType && f.itemId === itemId);
  },

  getFlaggedPersonIds(itemType: FlagItemType, itemId: string): string[] {
    return this.getForItem(itemType, itemId).map((f) => f.trustedPersonId);
  },

  getFlagsForPerson(trustedPersonId: string): ItemFlag[] {
    return cache.filter((f) => f.trustedPersonId === trustedPersonId);
  },

  getFlagsForPersonByType(trustedPersonId: string, itemType: FlagItemType): ItemFlag[] {
    return cache.filter((f) => f.trustedPersonId === trustedPersonId && f.itemType === itemType);
  },

  countForPerson(trustedPersonId: string): { bills: number; documents: number } {
    const flags = this.getFlagsForPerson(trustedPersonId);
    return {
      bills: flags.filter((f) => f.itemType === 'bill').length,
      documents: flags.filter((f) => f.itemType === 'document').length,
    };
  },

  async setFlags(
    itemType: FlagItemType,
    itemId: string,
    trustedPersonIds: string[]
  ): Promise<void> {
    if (isDemoModeActive()) return;

    const householdId = await getHouseholdId();
    const current = this.getFlaggedPersonIds(itemType, itemId);
    const toAdd = trustedPersonIds.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !trustedPersonIds.includes(id));

    if (toAdd.length > 0) {
      const rows = toAdd.map((personId) => ({
        household_id: householdId,
        item_type: itemType,
        item_id: itemId,
        trusted_person_id: personId,
      }));
      const { data, error } = await supabase
        .from('item_flags')
        .insert(rows)
        .select();
      if (error) throw error;
      if (data) {
        for (const row of data) {
          cache.push(rowToFlag(row as ItemFlagRow));
        }
      }
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('item_flags')
        .delete()
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .in('trusted_person_id', toRemove);
      if (error) throw error;
      cache = cache.filter(
        (f) =>
          !(
            f.itemType === itemType &&
            f.itemId === itemId &&
            toRemove.includes(f.trustedPersonId)
          )
      );
    }
  },

  clearCache(): void {
    cache = [];
    loaded = false;
  },
};
