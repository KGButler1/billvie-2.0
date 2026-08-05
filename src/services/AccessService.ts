import { AccessGrant, AccessScope, TrustedPerson } from '@/types/people';
import { PeopleService } from './PeopleService';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

const now = () => new Date().toISOString();

function rowToGrant(row: Record<string, unknown>): AccessGrant {
  return {
    id: row.id as string,
    personId: row.person_id as string,
    scope: row.scope as AccessScope,
    itemId: (row.item_id as string) || undefined,
    grantedAt: row.granted_at as string,
    revokedAt: (row.revoked_at as string) || undefined,
  };
}

let cache: AccessGrant[] = [];
let loaded = false;

export const AccessService = {
  async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('access_grants')
      .select('*')
      .eq('household_id', householdId)
      .order('granted_at', { ascending: true });

    if (error) throw error;
    cache = (data || []).map(rowToGrant);
    loaded = true;
  },

  getRawGrants(): AccessGrant[] {
    return loaded ? cache : [];
  },

  getGrants(): AccessGrant[] {
    return this.getRawGrants().filter((g) => !g.revokedAt);
  },

  getGrantsForPerson(personId: string): AccessGrant[] {
    return this.getGrants().filter((g) => g.personId === personId);
  },

  getPeopleWithAccessTo(scope: AccessScope, itemId?: string): TrustedPerson[] {
    const ids = new Set(
      this.getGrants()
        .filter((g) => g.scope === scope && (itemId === undefined || g.itemId === undefined || g.itemId === itemId))
        .map((g) => g.personId)
    );
    return PeopleService.getAll().filter((p) => ids.has(p.id));
  },

  // ---- Resolution. The only way visibility is ever determined. ----

  hasWholeScope(personId: string, scope: AccessScope): boolean {
    return this.getGrants().some((g) => g.personId === personId && g.scope === scope && !g.itemId);
  },

  canSee(personId: string, scope: AccessScope, itemId?: string): boolean {
    return this.getGrants().some(
      (g) =>
        g.personId === personId &&
        g.scope === scope &&
        (!g.itemId || (itemId !== undefined && g.itemId === itemId))
    );
  },

  getPeopleFor(scope: AccessScope, itemId?: string): TrustedPerson[] {
    return PeopleService.getAll()
      .filter((p) => p.status !== 'removed')
      .filter((p) => this.canSee(p.id, scope, itemId));
  },

  // ---- Writes. Nothing here ever deletes a grant. ----

  async grant(personId: string, scope: AccessScope, itemId?: string): Promise<AccessGrant> {
    const existing = this.getGrants().find(
      (g) => g.personId === personId && g.scope === scope && g.itemId === itemId
    );
    if (existing) return existing;

    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId,
      person_id: personId,
      scope,
      item_id: itemId || null,
    };
    const { data, error } = await supabase
      .from('access_grants')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const created = rowToGrant(data);
    cache.push(created);
    return created;
  },

  async grantWholeScope(personId: string, scope: AccessScope): Promise<AccessGrant> {
    const itemGrants = this.getGrants()
      .filter((g) => g.personId === personId && g.scope === scope && g.itemId);
    for (const g of itemGrants) {
      await this.revoke(g.id);
    }
    return this.grant(personId, scope);
  },

  async grantItem(personId: string, scope: AccessScope, itemId: string): Promise<AccessGrant> {
    const whole = this.getGrants().find((g) => g.personId === personId && g.scope === scope && !g.itemId);
    if (whole) return whole;
    return this.grant(personId, scope, itemId);
  },

  async narrowToItems(personId: string, scope: AccessScope, itemIds: string[]): Promise<void> {
    const wholeGrants = this.getGrants()
      .filter((g) => g.personId === personId && g.scope === scope && !g.itemId);
    for (const g of wholeGrants) {
      await this.revoke(g.id);
    }
    for (const id of itemIds) {
      await this.grant(personId, scope, id);
    }
  },

  async revoke(grantId: string): Promise<void> {
    const existing = cache.find((g) => g.id === grantId);
    if (!existing || existing.revokedAt) return;

    const { error } = await supabase
      .from('access_grants')
      .update({ revoked_at: now() })
      .eq('id', grantId);
    if (error) throw error;
    const idx = cache.findIndex((g) => g.id === grantId);
    if (idx !== -1) cache[idx] = { ...cache[idx], revokedAt: now() };
  },

  async revokeScopeForPerson(personId: string, scope: AccessScope, itemId?: string): Promise<void> {
    const grants = this.getGrants()
      .filter((g) => g.personId === personId && g.scope === scope && g.itemId === itemId);
    for (const g of grants) {
      await this.revoke(g.id);
    }
  },

  getHistoryForPerson(personId: string): AccessGrant[] {
    return this.getRawGrants()
      .filter((g) => g.personId === personId && g.revokedAt)
      .sort((a, b) => (b.revokedAt || '').localeCompare(a.revokedAt || ''));
  },

  getActivePeople(): TrustedPerson[] {
    const grants = this.getGrants();
    return PeopleService.getAll().filter(
      (p) => p.status === 'active' && grants.some((g) => g.personId === p.id)
    );
  },
};
