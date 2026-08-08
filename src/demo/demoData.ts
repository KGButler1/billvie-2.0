import type { Bill } from '@/types/bill';
import type { HouseholdDocument } from '@/types/document';
import type { KeyPerson } from '@/types/keyPerson';
import type { TrustedPerson, AccessGrant } from '@/types/people';
import type { SuperannuationEntry } from '@/services/FinancialInfoService';

const now = new Date().toISOString();
const daysFromNow = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const DEMO_PEOPLE: TrustedPerson[] = [
  {
    id: 'demo-claire',
    name: 'Claire Reyes',
    email: 'claire.reyes@example.com',
    role: 'household',
    status: 'active',
    accessLevel: 'owner',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-mark',
    name: 'Mark Reyes',
    email: 'mark.reyes@example.com',
    role: 'household',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-eleanor',
    name: 'Eleanor Whitfield',
    email: 'eleanor.whitfield@example.com',
    role: 'household',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
];

export const DEMO_KEY_PEOPLE: KeyPerson[] = [
  {
    id: 'demo-kp-diane',
    name: 'Diane Torres',
    relationship: 'neighbor',
    phone: '(555) 204-7781',
    role: 'Has the spare key',
    notes:
      'Diane has a key and checks in Tuesdays and Fridays. If you can\'t reach us, she\'s the one who\'ll actually know what\'s going on. She also knows Mom prefers the porch door, not the front.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-kp-linda',
    name: 'Linda Cho',
    relationship: 'attorney',
    phone: '(555) 340-2299',
    role: 'Handles Mom\'s will and estate paperwork',
    notes:
      'Keeps the original will on file. Call her before doing anything with the estate, she already knows the plan.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-kp-robert',
    name: 'Robert Reyes',
    relationship: 'sibling',
    phone: '(555) 118-9042',
    role: 'Backup contact, lives in Denver',
    notes:
      'Knows where the safe deposit box key is if Mark\'s ever unreachable. Not local, but he\'s the fallback.',
    createdAt: now,
    updatedAt: now,
  },
];

export const DEMO_BILLS: Bill[] = [
  {
    id: 'demo-bill-medicare',
    name: "Mom's Medicare Supplement",
    amount: 187.4,
    dueDate: daysFromNow(5),
    isRecurring: true,
    recurringInterval: 'monthly',
    paymentMethod: 'direct_debit',
    category: 'other',
    notes:
      'Autopays from Mom\'s checking, but the statement comes to Claire\'s email. Worth a quick check each month that it actually cleared.',
    isAutoDebited: true,
    status: 'pending',
    taggedPersonIds: ['demo-eleanor'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-bill-insurance',
    name: "Mom's Home Insurance",
    amount: 1128.0,
    dueDate: daysFromNow(6),
    isRecurring: true,
    recurringInterval: 'yearly',
    category: 'insurance',
    notes:
      'Premium jumps every March without fail. Call Jerry at the agency before it renews. A five minute call has saved real money before.',
    status: 'due_soon',
    taggedPersonIds: ['demo-eleanor'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-bill-electric',
    name: "Mom's Electric Bill",
    amount: 118.6,
    dueDate: daysFromNow(-3),
    isRecurring: true,
    recurringInterval: 'monthly',
    category: 'utilities',
    notes:
      'This one\'s easy to miss since it\'s not on autopay. Set a reminder around the 3rd of the month.',
    status: 'overdue',
    taggedPersonIds: ['demo-eleanor'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-bill-mortgage',
    name: 'Maple Street Mortgage',
    amount: 2140.0,
    dueDate: daysFromNow(1),
    isRecurring: true,
    recurringInterval: 'monthly',
    paymentMethod: 'direct_debit',
    category: 'rent_mortgage',
    notes: 'Refinanced in 2023, autopay through the credit union.',
    isAutoDebited: true,
    status: 'paid',
    paidDate: daysFromNow(-1),
    taggedPersonIds: ['demo-mark'],
    createdAt: now,
    updatedAt: now,
  },
];

export const DEMO_DOCUMENTS: HouseholdDocument[] = [
  {
    id: 'demo-doc-directive',
    title: "Eleanor's Advance Directive",
    provider: '',
    type: 'other',
    keyDetail: 'Signed 2022, names Claire as healthcare proxy.',
    notes:
      'This is the one document that matters most if something happens fast. Don\'t wait to find it. It\'s already where it needs to be.',
    physicalLocation: 'Original with Linda Cho, copy in the kitchen drawer at Mom\'s.',
    taggedPersonIds: ['demo-eleanor'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-doc-will',
    title: "Eleanor's Will (copy)",
    provider: '',
    type: 'will',
    notes:
      'Original is with Linda Cho. This copy is just so nobody has to search for it under pressure.',
    physicalLocation: 'Fireproof box, Mark\'s office closet.',
    taggedPersonIds: ['demo-eleanor'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-doc-warranty',
    title: 'Maple Street Home Warranty',
    provider: 'American Home Shield',
    type: 'other',
    notes:
      'Covers the HVAC and water heater through 2027. Not urgent, just handy to have in one place.',
    taggedPersonIds: ['demo-mark'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-doc-note',
    title: 'A Note From Mark',
    provider: '',
    type: 'other',
    notes: 'Everything you\'d need is here. You never have to guess.',
    createdAt: now,
    updatedAt: now,
  },
];

export const DEMO_SUPERANNUATION: SuperannuationEntry[] = [
  {
    id: 'demo-fin-checking',
    fundName: "Mom's First National Checking and Savings",
    accountType: 'checking',
    estimatedBalance: 0,
    contactInfo: 'Ask for Marcus at the Elm Street branch. He\'s helped Mom for years.',
    notes:
      'We don\'t track the balance here on purpose. Call the branch for the current number. This is just so you know where to look.',
  },
  {
    id: 'demo-fin-401k',
    fundName: 'Fidelity 401(k)',
    accountType: 'retirement',
    estimatedBalance: 0,
    notes: 'Mark rolled this over when he left Meridian in 2019. Statements go to his email.',
  },
];

export const DEMO_INSURANCE: never[] = [];
export const DEMO_INCOME: never[] = [];
export const DEMO_DEBTS: never[] = [];
export const DEMO_MISC: never[] = [];

export const DEMO_ACCESS_GRANTS: AccessGrant[] = [];

export const DEMO_HOUSEHOLD_NAME = 'Reyes-Whitfield Household';
