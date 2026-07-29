export type KeyPersonRelationship =
  | 'spouse'
  | 'child'
  | 'parent'
  | 'sibling'
  | 'friend'
  | 'attorney'
  | 'advisor'
  | 'neighbor'
  | 'other';

export interface KeyPerson {
  id: string;
  name: string;
  relationship: KeyPersonRelationship | string;
  phone?: string;
  email?: string;
  address?: string;
  role: string; // e.g. "Has power of attorney", "Holds a spare key", "Knows the alarm code"
  notes?: string;
  visibility: 'private' | 'shared'; // same pattern as HouseholdDocument
  createdAt: string;
  updatedAt: string;
}

export const KEY_PERSON_RELATIONSHIP_LABELS: Record<KeyPersonRelationship, string> = {
  spouse: 'Spouse / Partner',
  child: 'Adult Child',
  parent: 'Parent',
  sibling: 'Sibling',
  friend: 'Friend',
  attorney: 'Attorney',
  advisor: 'Advisor',
  neighbor: 'Neighbor',
  other: 'Other',
};

export const KEY_PERSON_RELATIONSHIPS = Object.keys(
  KEY_PERSON_RELATIONSHIP_LABELS
) as KeyPersonRelationship[];
