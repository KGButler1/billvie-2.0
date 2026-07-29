import { KeyPerson } from '@/types/keyPerson';

const STORAGE_KEY = 'billvie_key_people';

export const KeyPeopleService = {
  getAllKeyPeople(): KeyPerson[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(people: KeyPerson[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  },

  addKeyPerson(person: Omit<KeyPerson, 'id' | 'createdAt' | 'updatedAt'>): KeyPerson {
    const people = this.getAllKeyPeople();
    const newPerson: KeyPerson = {
      ...person,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    people.push(newPerson);
    this.save(people);
    return newPerson;
  },

  updateKeyPerson(id: string, updates: Partial<KeyPerson>) {
    const people = this.getAllKeyPeople();
    const idx = people.findIndex(p => p.id === id);
    if (idx !== -1) {
      people[idx] = { ...people[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save(people);
    }
  },

  deleteKeyPerson(id: string) {
    this.save(this.getAllKeyPeople().filter(p => p.id !== id));
  },

  getSharedKeyPeople(): KeyPerson[] {
    return this.getAllKeyPeople().filter(p => p.visibility === 'shared');
  },

  getCount(): number {
    return this.getAllKeyPeople().length;
  },
};
