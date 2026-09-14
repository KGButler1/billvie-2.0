import { BankAccount } from '@/types/bankAccount';
import { LinkedItem } from '@/types/linkedItem';
import { BillService } from './BillService';
import { FinancialInfoService } from './FinancialInfoService';
import { EventService } from './EventService';
import { EventExpenseService } from './EventExpenseService';
import { formatCurrency } from '@/utils/currency';
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

  getLinkedItems(id: string): LinkedItem[] {
    const items: LinkedItem[] = [];
    BillService.getAllBills()
      .filter((b) => !b.deletedAt && b.bankAccountId === id)
      .forEach((b) =>
        items.push({
          id: b.id,
          kind: 'bill',
          title: b.name,
          detail: b.amount !== undefined ? formatCurrency(b.amount) : undefined,
          isAutoDebited: b.isAutoDebited,
          path: '/bills',
        })
      );
    FinancialInfoService.getDebts()
      .filter((d) => !d.deletedAt && d.linkedBankAccountId === id)
      .forEach((d) =>
        items.push({
          id: d.id,
          kind: 'debt',
          title: d.owedTo,
          detail: d.approximateBalance !== undefined ? formatCurrency(d.approximateBalance) : undefined,
          path: '/financial',
        })
      );
    FinancialInfoService.getIncome()
      .filter((i) => !i.deletedAt && i.linkedBankAccountId === id)
      .forEach((i) =>
        items.push({
          id: i.id,
          kind: 'income',
          title: i.sourceName,
          detail: i.approximateAmount !== undefined ? formatCurrency(i.approximateAmount) : undefined,
          path: '/financial',
        })
      );
    FinancialInfoService.getSuperannuation()
      .filter((s) => !s.deletedAt && s.linkedBankAccountId === id)
      .forEach((s) =>
        items.push({
          id: s.id,
          kind: 'superannuation',
          title: s.fundName,
          detail: s.estimatedBalance !== undefined ? formatCurrency(s.estimatedBalance) : undefined,
          path: '/financial',
        })
      );
    EventService.getAllEvents().forEach((event) => {
      if (event.deletedAt) return;
      EventExpenseService.getExpenses(event.id)
        .filter((e) => e.bankAccountId === id)
        .forEach((e) =>
          items.push({
            id: e.id,
            kind: 'event_expense',
            title: e.name,
            detail: e.amount !== undefined ? formatCurrency(e.amount) : undefined,
            path: `/events/${event.id}`,
          })
        );
    });
    return items;
  },

  countLinkedBills(id: string): number {
    return this.getLinkedItems(id).filter((i) => i.kind === 'bill').length;
  },

  countLinkedIncome(id: string): number {
    return this.getLinkedItems(id).filter((i) => i.kind === 'income').length;
  },

  countLinkedDebts(id: string): number {
    return this.getLinkedItems(id).filter((i) => i.kind === 'debt').length;
  },

  countLinkedSuperannuation(id: string): number {
    return this.getLinkedItems(id).filter((i) => i.kind === 'superannuation').length;
  },

  countLinkedEventExpenses(id: string): number {
    return this.getLinkedItems(id).filter((i) => i.kind === 'event_expense').length;
  },

  linkedSummary(id: string): string | undefined {
    const parts: string[] = [];
    const bills = this.countLinkedBills(id);
    const income = this.countLinkedIncome(id);
    const debts = this.countLinkedDebts(id);
    const superannuation = this.countLinkedSuperannuation(id);
    const eventExpenses = this.countLinkedEventExpenses(id);
    if (bills) parts.push(`${bills} ${bills === 1 ? 'bill' : 'bills'}`);
    if (income) parts.push(`${income} income ${income === 1 ? 'source' : 'sources'}`);
    if (debts) parts.push(`${debts} ${debts === 1 ? 'debt' : 'debts'}`);
    if (superannuation) parts.push(`${superannuation} ${superannuation === 1 ? 'account' : 'accounts'}`);
    if (eventExpenses) parts.push(`${eventExpenses} event ${eventExpenses === 1 ? 'expense' : 'expenses'}`);
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
