export type PersonRole = 'household' | 'advisor' | 'accountant';
export type TrustedPersonStatus = 'invited' | 'active' | 'removed';

export interface TrustedPerson {
  id: string;
  name: string;
  email: string; // required
  role: PersonRole;
  status: TrustedPersonStatus;
  accessLevel?: 'owner';
  userId?: string;
  inviteToken?: string;
  keyPersonId?: string; // one-way link to the KeyPerson record, if any
  invitedAt?: string;
  activatedAt?: string;
  removedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccessScope =
  | 'bills'
  | 'documents'
  | 'events'
  | 'tax_documents'
  | 'key_people'
  | 'financial_info';

export interface AccessGrant {
  id: string;
  personId: string;
  scope: AccessScope;
  itemId?: string; // undefined = the whole scope
  grantedAt: string;
  revokedAt?: string; // NEVER delete a grant — this is the history
}

export const ACCESS_SCOPE_LABELS: Record<AccessScope, string> = {
  bills: 'Bills',
  documents: 'Important documents',
  events: 'Events',
  tax_documents: 'Tax documents',
  key_people: 'Key contacts',
  financial_info: 'Financial snapshot',
};

export const ACCESS_SCOPES: AccessScope[] = [
  'bills',
  'documents',
  'events',
  'tax_documents',
  'key_people',
  'financial_info',
];

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  household: 'Household',
  advisor: 'Advisor',
  accountant: 'Accountant',
};
