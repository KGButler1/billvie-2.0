// A bank account reference is like a payment card reference — enough to identify
// which account a bill comes from, never enough to move money.
export interface BankAccount {
  id: string;
  nickname: string; // "Everyday account", "Mortgage offset" — free text
  institution?: string; // "Commonwealth Bank" — free text, optional
  lastDigits?: string; // last 2-4 digits, optional, stored as text to preserve leading zeros
  notes?: string;
  archivedAt?: string; // soft-archive; accounts referenced by bills are never hard-deleted
  createdAt: string;
  updatedAt: string;
}
