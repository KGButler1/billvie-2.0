import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';
import { AccessScope } from '@/types/people';

export interface Exclusion {
  id: string;
  personId: string;
  scope: AccessScope;
  itemId?: string;
  excludedAt: string;
  restoredAt?: string;
}

function rowToExclusion(row: Record<string, unknown>): Exclusion {
  return {
    id: row.id as string,
    personId: row.person_id as string,
    scope: row.scope as AccessScope,
    itemId: (row.item_id as string) || undefined,
    excludedAt: row.excluded_at as string,
    restoredAt: (row.restored_at as string) || undefined,
  };
}

let cache: Exclusion[] = [];
let loaded = false;

export const ExclusionService = {
  isLoaded(): boolean {
    return loaded;
  },

  async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('access_exclusions')
      .select('*')
      .eq('household_id', householdId)
      .order('excluded_at', { ascending: true });

    if (error) throw error;
    cache = (data || []).map(rowToExclusion);
    loaded = true;
  },

  getRaw(): Exclusion[] {
    return loaded ? cache : [];
  },

  getActive(): Exclusion[] {
    return this.getRaw().filter((e) => !e.restoredAt);
  },

  getForPerson(personId: string): Exclusion[] {
    return this.getActive().filter((e) => e.personId === personId);
  },

  isExcluded(personId: string, scope: AccessScope, itemId?: string): boolean {
    return this.getActive().some(
      (e) =>
        e.personId === personId &&
        e.scope === scope &&
        (e.itemId === undefined || (itemId !== undefined && e.itemId === itemId))
    );
  },

  isWholeScopeExcluded(personId: string, scope: AccessScope): boolean {
    return this.getActive().some(
      (e) => e.personId === personId && e.scope === scope && !e.itemId
    );
  },

  async exclude(personId: string, scope: AccessScope, itemId?: string): Promise<void> {
    const existing = this.getActive().find(
      (e) => e.personId === personId && e.scope === scope && e.itemId === itemId
    );
    if (existing) return;

    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('access_exclusions')
      .insert({
        household_id: householdId,
        person_id: personId,
        scope,
        item_id: itemId || null,
      })
      .select()
      .single();
    if (error) throw error;
    cache.push(rowToExclusion(data));
  },

  async restore(personId: string, scope: AccessScope, itemId?: string): Promise<void> {
    const existing = this.getActive().find(
      (e) => e.personId === personId && e.scope === scope && e.itemId === itemId
    );
    if (!existing) return;

    const { error } = await supabase
      .from('access_exclusions')
      .update({ restored_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;

    const idx = cache.findIndex((e) => e.id === existing.id);
    if (idx !== -1) cache[idx] = { ...cache[idx], restoredAt: new Date().toISOString() };
  },
};
