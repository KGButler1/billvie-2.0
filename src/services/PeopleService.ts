import { TrustedPerson, PersonRole, AccessScope, TrustedPersonStatus } from '@/types/people';
import { AccessService } from './AccessService';
import { KeyPeopleService } from './KeyPeopleService';
import { KEY_PERSON_RELATIONSHIP_LABELS, KeyPersonRelationship } from '@/types/keyPerson';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';
import { isDemoModeActive } from '@/demo/demoFlag';
import { DEMO_PEOPLE } from '@/demo/demoData';

let demoCache: TrustedPerson[] = DEMO_PEOPLE.map((p) => ({ ...p }));

const now = () => new Date().toISOString();

const makeToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 16; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
};

function rowToPerson(row: Record<string, unknown>): TrustedPerson {
  return {
    id: row.id as string,
    name: row.display_name as string || row.name as string || (row.email as string)?.split('@')[0] || 'You',
    email: row.email as string,
    role: (row.role as PersonRole) || 'household',
    status: (row.status as TrustedPersonStatus) || 'invited',
    accessLevel: (row.access_level as 'owner') || undefined,
    userId: (row.user_id as string) || undefined,
    inviteToken: (row.invite_token as string) || undefined,
    keyPersonId: (row.key_person_id as string) || undefined,
    invitedAt: (row.invited_at as string) || undefined,
    activatedAt: (row.activated_at as string) || undefined,
    removedAt: (row.removed_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

let cache: TrustedPerson[] = [];
let loaded = false;

export interface DirectoryEntry {
  key: string;
  name: string;
  email?: string;
  relationship?: string;
  role: PersonRole | 'contact';
  hasAccess: boolean;
  isOwner?: boolean;
  trustedPersonId?: string;
  keyPersonId?: string;
  scopes: AccessScope[];
  status?: TrustedPersonStatus;
}

export const PeopleService = {
  async refresh(): Promise<void> {
    if (isDemoModeActive()) return;
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('trusted_person')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    cache = (data || []).map(rowToPerson);
    loaded = true;
  },

  getRaw(): TrustedPerson[] {
    if (isDemoModeActive()) return demoCache;
    return loaded ? cache : [];
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

  async invite({
    name,
    email,
    role,
    keyPersonId,
  }: {
    name: string;
    email: string;
    role: PersonRole;
    keyPersonId?: string;
  }): Promise<TrustedPerson> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${supabaseUrl}/functions/v1/invite-household-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), role, keyPersonId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Invite failed' }));
      throw new Error(body.error || `Invite failed (${response.status})`);
    }

    const body = await response.json();
    const person = rowToPerson(body.person);
    cache.push(person);
    return person;
  },

  async activate(id: string): Promise<TrustedPerson | undefined> {
    const { data, error } = await supabase
      .from('trusted_person')
      .update({
        status: 'active',
        activated_at: now(),
        updated_at: now(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updated = rowToPerson(data);
    const idx = cache.findIndex((p) => p.id === id);
    if (idx !== -1) cache[idx] = updated;
    return updated;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('trusted_person')
      .update({
        status: 'removed',
        removed_at: now(),
        updated_at: now(),
      })
      .eq('id', id);

    if (error) throw error;
    const idx = cache.findIndex((p) => p.id === id);
    if (idx !== -1) cache[idx] = { ...cache[idx], status: 'removed', removedAt: now() };

    // Revoke all access grants for this person. A failure here must not
    // hide the fact that the core removal (the status update) already
    // succeeded — the person's status is 'removed', which is what access
    // control actually checks.
    const grants = AccessService.getGrantsForPerson(id);
    for (const g of grants) {
      try {
        await AccessService.revoke(g.id);
      } catch (err) {
        console.error(`Failed to revoke grant ${g.id} for person ${id}:`, err);
      }
    }
  },

  async linkToKeyPerson(personId: string, keyPersonId: string): Promise<void> {
    const { error } = await supabase
      .from('trusted_person')
      .update({ key_person_id: keyPersonId, updated_at: now() })
      .eq('id', personId);
    if (error) throw error;
    const idx = cache.findIndex((p) => p.id === personId);
    if (idx !== -1) cache[idx] = { ...cache[idx], keyPersonId };
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
        isOwner: p.accessLevel === 'owner',
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
