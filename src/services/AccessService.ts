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

  // Sets revokedAt. Never deletes — the history is the point.
  revoke(grantId: string): void {
    const grants = readGrants();
    const idx = grants.findIndex((g) => g.id === grantId);
    if (idx === -1 || grants[idx].revokedAt) return;
    grants[idx] = { ...grants[idx], revokedAt: now() };
    writeGrants(grants);
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
