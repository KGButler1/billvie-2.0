import { KeyPerson } from '@/types/keyPerson';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

function rowToPerson(row: Record<string, unknown>): KeyPerson {
  return {
    id: row.id as string,
    name: row.name as string,
    relationship: (row.relationship as string) || 'other',
    phone: (row.phone as string) || undefined,
    email: (row.email as string) || undefined,
    address: (row.address as string) || undefined,
    role: (row.role as string) || '',
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function personToRow(person: Partial<KeyPerson>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (person.name !== undefined) row.name = person.name;
  if (person.relationship !== undefined) row.relationship = person.relationship;
  if (person.phone !== undefined) row.phone = person.phone || null;
  if (person.email !== undefined) row.email = person.email || null;
  if (person.address !== undefined) row.address = person.address || null;
  if (person.role !== undefined) row.role = person.role || null;
  if (person.notes !== undefined) row.notes = person.notes || null;
  return row;
}

let cache: KeyPerson[] = [];
let loaded = false;

export const KeyPeopleService = {
  async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('key_people')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    cache = (data || []).map(rowToPerson);
    loaded = true;
  },

  getAllKeyPeople(): KeyPerson[] {
    return loaded ? cache : [];
  },

  async addKeyPerson(person: Omit<KeyPerson, 'id' | 'createdAt' | 'updatedAt'>): Promise<KeyPerson> {
    const householdId = await getHouseholdId();
    const row = { ...personToRow(person), household_id: householdId };

    const { data, error } = await supabase
      .from('key_people')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    const newPerson = rowToPerson(data);
    cache.push(newPerson);
    return newPerson;
  },

  async updateKeyPerson(id: string, updates: Partial<KeyPerson>): Promise<void> {
    const row = { ...personToRow(updates), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('key_people')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updated = rowToPerson(data);
    const idx = cache.findIndex((p) => p.id === id);
    if (idx !== -1) cache[idx] = updated;
  },

  async deleteKeyPerson(id: string): Promise<void> {
    const { error } = await supabase.from('key_people').delete().eq('id', id);
    if (error) throw error;
    cache = cache.filter((p) => p.id !== id);
  },

  getById(id: string): KeyPerson | undefined {
    return this.getAllKeyPeople().find((p) => p.id === id);
  },

  getCount(): number {
    return this.getAllKeyPeople().length;
  },
};
