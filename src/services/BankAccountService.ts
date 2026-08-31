import { BankAccount } from '@/types/bankAccount';
import { BillService } from './BillService';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

const now = () => new Date().toISOString();

function rowToAccount(row: Record<string, unknown>): BankAccount {
  return {
    id: row.id as string,
    nickname: row.nickname as string,
    institution: (row.institution as string) || undefined,
    lastDigits: (row.last_digits as string) || undefined,
    notes: (row.notes as string) || undefined,
    archivedAt: (row.archived_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function accountToRow(account: Partial<BankAccount>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (account.nickname !== undefined) row.nickname = account.nickname;
  if (account.institution !== undefined) row.institution = account.institution || null;
  if (account.lastDigits !== undefined) row.last_digits = account.lastDigits || null;
  if (account.notes !== undefined) row.notes = account.notes || null;
  if (account.archivedAt !== undefined) row.archived_at = account.archivedAt || null;
  return row;
}

let cache: BankAccount[] = [];
let loaded = false;

export const BankAccountService = {
  isLoaded(): boolean {
    return loaded;
  },

  async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    cache = (data || []).map(rowToAccount);
    loaded = true;
  },

  getRaw(): BankAccount[] {
    return loaded ? cache : [];
  },

  getAll(): BankAccount[] {
    return this.getRaw().filter((a) => !a.archivedAt);
  },

  getArchived(): BankAccount[] {
    return this.getRaw().filter((a) => !!a.archivedAt);
  },

  getById(id?: string): BankAccount | undefined {
    if (!id) return undefined;
    return this.getRaw().find((a) => a.id === id);
  },

  async add(data: Pick<BankAccount, 'nickname'> & Partial<BankAccount>): Promise<BankAccount> {
    const householdId = await getHouseholdId();
    const row = { ...accountToRow(data), household_id: householdId };

    const { data: result, error } = await supabase
      .from('bank_accounts')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    const newAccount = rowToAccount(result);
    cache.push(newAccount);
    return newAccount;
  },

  async update(id: string, updates: Partial<BankAccount>): Promise<BankAccount | undefined> {
    const row = { ...accountToRow(updates), updated_at: now() };
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updated = rowToAccount(data);
    const index = cache.findIndex((a) => a.id === id);
    if (index !== -1) cache[index] = updated;
    return updated;
  },

  countLinkedBills(id: string): number {
    return BillService.getAllBills().filter((b) => b.bankAccountId === id).length;
  },

  async archive(id: string): Promise<void> {
    await this.update(id, { archivedAt: now() });
  },

  async restore(id: string): Promise<void> {
    await this.update(id, { archivedAt: undefined });
  },

  async remove(id: string): Promise<'deleted' | 'archived'> {
    if (this.countLinkedBills(id) > 0) {
      await this.archive(id);
      return 'archived';
    }
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) throw error;
    cache = cache.filter((a) => a.id !== id);
    return 'deleted';
  },
};
