import { AccessGrant, AccessScope, TrustedPerson } from '@/types/people';
import { PeopleService } from './PeopleService';

const GRANTS_KEY = 'billvie_access_grants';

const now = () => new Date().toISOString();

const readGrants = (): AccessGrant[] => {
  const data = localStorage.getItem(GRANTS_KEY);
  return data ? JSON.parse(data) : [];
};

const writeGrants = (grants: AccessGrant[]) => {
  localStorage.setItem(GRANTS_KEY, JSON.stringify(grants));
};

export const AccessService = {
  getRawGrants(): AccessGrant[] {
    return readGrants();
  },

  getGrants(): AccessGrant[] {
    return readGrants().filter((g) => !g.revokedAt);
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

  grant(personId: string, scope: AccessScope, itemId?: string): AccessGrant {
    const grants = readGrants();
    const existing = grants.find(
      (g) => g.personId === personId && g.scope === scope && g.itemId === itemId && !g.revokedAt
    );
    if (existing) return existing;

    const created: AccessGrant = {
      id: `ag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      personId,
      scope,
      itemId,
      grantedAt: now(),
    };
    grants.push(created);
    writeGrants(grants);
    return created;
  },

  // Whole-scope supersedes any item grants in that scope.
  grantWholeScope(personId: string, scope: AccessScope): AccessGrant {
    this.getGrants()
      .filter((g) => g.personId === personId && g.scope === scope && g.itemId)
      .forEach((g) => this.revoke(g.id));
    return this.grant(personId, scope);
  },

  // No-op when the person already sees the whole scope.
  grantItem(personId: string, scope: AccessScope, itemId: string): AccessGrant {
    const whole = this.getGrants().find((g) => g.personId === personId && g.scope === scope && !g.itemId);
    if (whole) return whole;
    return this.grant(personId, scope, itemId);
  },

  // Single call so the UI can never leave a person half-converted.
  narrowToItems(personId: string, scope: AccessScope, itemIds: string[]): void {
    this.getGrants()
      .filter((g) => g.personId === personId && g.scope === scope && !g.itemId)
      .forEach((g) => this.revoke(g.id));
    itemIds.forEach((id) => this.grant(personId, scope, id));
  },

  // Sets revokedAt. Never deletes — the history is the point. Tolerates
  // an already-revoked or missing grant so migrations stay idempotent.
  revoke(grantId: string): void {
    const grants = readGrants();
    const idx = grants.findIndex((g) => g.id === grantId);
    if (idx === -1 || grants[idx].revokedAt) return;
    grants[idx] = { ...grants[idx], revokedAt: now() };
    writeGrants(grants);
  },

  revokeScopeForPerson(personId: string, scope: AccessScope, itemId?: string): void {
    this.getGrants()
      .filter((g) => g.personId === personId && g.scope === scope && g.itemId === itemId)
      .forEach((g) => this.revoke(g.id));
  },

  getHistoryForPerson(personId: string): AccessGrant[] {
    return readGrants()
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
