import { BankAccount } from '@/types/bankAccount';
import { BillService } from './BillService';
import { FinancialInfoService } from './FinancialInfoService';
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
    deletedAt: (row.deleted_at as string) || undefined,
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
  if (account.deletedAt !== undefined) row.deleted_at = account.deletedAt || null;
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
    return this.getRaw().filter((a) => !a.deletedAt);
  },

  getDeleted(): BankAccount[] {
    return this.getRaw().filter((a) => !!a.deletedAt);
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

  countLinkedIncome(id: string): number {
    return FinancialInfoService.getIncome().filter((i) => i.linkedBankAccountId === id).length;
  },

  countLinkedDebts(id: string): number {
    return FinancialInfoService.getDebts().filter((d) => d.linkedBankAccountId === id).length;
  },

  countLinkedSuperannuation(id: string): number {
    return FinancialInfoService.getSuperannuation().filter((s) => s.linkedBankAccountId === id).length;
  },

  linkedSummary(id: string): string | undefined {
    const parts: string[] = [];
    const bills = this.countLinkedBills(id);
    const income = this.countLinkedIncome(id);
    const debts = this.countLinkedDebts(id);
    const superannuation = this.countLinkedSuperannuation(id);
    if (bills) parts.push(`${bills} ${bills === 1 ? 'bill' : 'bills'}`);
    if (income) parts.push(`${income} income ${income === 1 ? 'source' : 'sources'}`);
    if (debts) parts.push(`${debts} ${debts === 1 ? 'debt' : 'debts'}`);
    if (superannuation) parts.push(`${superannuation} ${superannuation === 1 ? 'account' : 'accounts'}`);
    if (!parts.length) return undefined;
    return `Linked to ${parts.join(', ')}. They'll keep showing this account until you restore it or delete it permanently.`;
  },

  async remove(id: string): Promise<void> {
    await this.update(id, { deletedAt: now() });
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from('bank_accounts')
      .update({ deleted_at: null, updated_at: now() })
      .eq('id', id);
    if (error) throw error;
    const index = cache.findIndex((a) => a.id === id);
    if (index !== -1) cache[index] = { ...cache[index], deletedAt: undefined, updatedAt: now() };
  },

  async permanentlyRemove(id: string): Promise<void> {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) throw error;
    cache = cache.filter((a) => a.id !== id);
  },
};
