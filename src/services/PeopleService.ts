import { TrustedPerson, PersonRole, AccessScope, TrustedPersonStatus } from '@/types/people';
import { AccessService } from './AccessService';
import { KeyPeopleService } from './KeyPeopleService';
import { KEY_PERSON_RELATIONSHIP_LABELS, KeyPersonRelationship } from '@/types/keyPerson';

const PEOPLE_KEY = 'billvie_trusted_people';
const MIGRATED_KEY = 'billvie_people_migrated_v1';
const LEGACY_SHARES_KEY = 'billvie_shares';

const now = () => new Date().toISOString();

const makeToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 16; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
};

const readPeople = (): TrustedPerson[] => {
  const data = localStorage.getItem(PEOPLE_KEY);
  return data ? JSON.parse(data) : [];
};

const writePeople = (people: TrustedPerson[]) => {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
};

export interface DirectoryEntry {
  key: string;
  name: string;
  email?: string;
  relationship?: string;
  role: PersonRole | 'contact';
  hasAccess: boolean;
  trustedPersonId?: string;
  keyPersonId?: string;
  scopes: AccessScope[];
  status?: TrustedPersonStatus;
}

// Migration from the legacy `billvie_shares` model. Runs once, guarded by
// `billvie_people_migrated_v1`. The legacy keys are deliberately left in place.
const runMigration = () => {
  if (localStorage.getItem(MIGRATED_KEY) === 'true') return;

  try {
    const raw = localStorage.getItem(LEGACY_SHARES_KEY);
    const shares: any[] = raw ? JSON.parse(raw) : [];
    const people = readPeople();

    shares.forEach((share) => {
      const email: string | undefined = share?.sharedWithEmail;
      if (!email) return;

      const role: PersonRole = share.type === 'advisor' ? 'advisor' : 'household';
      const status: TrustedPersonStatus = share.status === 'accepted' ? 'active' : 'invited';
      const token: string | undefined =
        typeof share.shareLink === 'string' ? share.shareLink.split('/').pop() : undefined;

      let person = people.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (!person) {
        person = {
          id: `tp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name: share.sharedWithName || email.split('@')[0],
          email,
          role,
          status,
          inviteToken: token,
          invitedAt: share.createdAt || now(),
          activatedAt: status === 'active' ? share.acceptedAt || now() : undefined,
          createdAt: share.createdAt || now(),
          updatedAt: now(),
        };
        people.push(person);
      } else {
        if (status === 'active') {
          person.status = 'active';
          person.activatedAt = person.activatedAt || share.acceptedAt || now();
        }
        if (!person.inviteToken && token) person.inviteToken = token;
      }

      const scopes: AccessScope[] =
        share.type === 'bills'
          ? ['bills']
          : share.type === 'event'
            ? ['events']
            : share.type === 'tax_documents'
              ? ['tax_documents']
              : share.type === 'advisor'
                ? ['bills', 'documents']
                : [];

      writePeople(people);
      scopes.forEach((scope) => AccessService.grant(person!.id, scope));
    });

    writePeople(people);
  } catch {
    // A broken legacy payload must never block the app.
  }

  localStorage.setItem(MIGRATED_KEY, 'true');
};

export const PeopleService = {
  getRaw(): TrustedPerson[] {
    runMigration();
    return readPeople();
  },

  getAll(): TrustedPerson[] {
    return this.getRaw().filter((p) => p.status !== 'removed');
  },

  getById(id: string): TrustedPerson | undefined {
    return this.getRaw().find((p) => p.id === id);
  },

  getByToken(token: string): TrustedPerson | undefined {
    return this.getRaw().find((p) => p.inviteToken === token);
  },

  getByRole(role: PersonRole): TrustedPerson[] {
    return this.getAll().filter((p) => p.role === role);
  },

  invite({
    name,
    email,
    role,
    keyPersonId,
  }: {
    name: string;
    email: string;
    role: PersonRole;
    keyPersonId?: string;
  }): TrustedPerson {
    const people = this.getRaw();
    const person: TrustedPerson = {
      id: `tp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      email: email.trim(),
      role,
      status: 'invited',
      inviteToken: makeToken(),
      keyPersonId,
      invitedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    };
    people.push(person);
    writePeople(people);
    return person;
  },

  activate(id: string): TrustedPerson | undefined {
    const people = this.getRaw();
    const idx = people.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    people[idx] = {
      ...people[idx],
      status: 'active',
      activatedAt: people[idx].activatedAt || now(),
      updatedAt: now(),
    };
    writePeople(people);
    return people[idx];
  },

  // Never deletes the row — the history matters.
  remove(id: string): void {
    const people = this.getRaw();
    const idx = people.findIndex((p) => p.id === id);
    if (idx === -1) return;
    people[idx] = { ...people[idx], status: 'removed', removedAt: now(), updatedAt: now() };
    writePeople(people);
    AccessService.getGrantsForPerson(id).forEach((g) => AccessService.revoke(g.id));
  },

  linkToKeyPerson(personId: string, keyPersonId: string): void {
    const people = this.getRaw();
    const idx = people.findIndex((p) => p.id === personId);
    if (idx === -1) return;
    people[idx] = { ...people[idx], keyPersonId, updatedAt: now() };
    writePeople(people);
  },

  getDirectory(): DirectoryEntry[] {
    const people = this.getAll();
    const keyPeople = KeyPeopleService.getAllKeyPeople();
    const linked = new Set(people.map((p) => p.keyPersonId).filter(Boolean) as string[]);

    const entries: DirectoryEntry[] = people.map((p) => {
      const kp = p.keyPersonId ? keyPeople.find((k) => k.id === p.keyPersonId) : undefined;
      const scopes = AccessService.getGrantsForPerson(p.id).map((g) => g.scope);
      return {
        key: `tp:${p.id}`,
        name: p.name,
        email: p.email,
        relationship: kp
          ? KEY_PERSON_RELATIONSHIP_LABELS[kp.relationship as KeyPersonRelationship] ||
            String(kp.relationship)
          : undefined,
        role: p.role,
        hasAccess: scopes.length > 0,
        trustedPersonId: p.id,
        keyPersonId: p.keyPersonId,
        scopes: Array.from(new Set(scopes)),
        status: p.status,
      };
    });

    keyPeople
      .filter((k) => !linked.has(k.id))
      .forEach((k) => {
        entries.push({
          key: `kp:${k.id}`,
          name: k.name,
          email: k.email,
          relationship:
            KEY_PERSON_RELATIONSHIP_LABELS[k.relationship as KeyPersonRelationship] ||
            String(k.relationship),
          role: 'contact',
          hasAccess: false,
          keyPersonId: k.id,
          scopes: [],
        });
      });

    return entries;
  },
};
