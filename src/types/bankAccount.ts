// A bank account reference is like a payment card reference — enough to identify
// which account a bill comes from, never enough to move money.
export interface BankAccount {
  id: string;
  nickname: string; // "Everyday account", "Mortgage offset" — free text
  institution?: string; // "Commonwealth Bank" — free text, optional
  lastDigits?: string; // last 2-4 digits, optional, stored as text to preserve leading zeros
  notes?: string;
  deletedAt?: string; // Soft delete — recoverable from Recently Deleted for 30 days
  createdAt: string;
  updatedAt: string;
}
