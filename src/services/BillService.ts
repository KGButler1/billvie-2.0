import { Bill, BillStatus, BillCategory, RecurringInterval } from '@/types/bill';
import { differenceInDays, parseISO, startOfDay, addWeeks, addMonths, addYears } from 'date-fns';
import { categorizeByName } from '@/utils/billCategorizer';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';
import { isDemoModeActive } from '@/demo/demoFlag';
import { DEMO_BILLS } from '@/demo/demoData';

let demoCache: Bill[] = DEMO_BILLS.map((b) => ({ ...b }));

// Calculate bill status based on due date and payment status.
// Auto-debited bills that have passed their due date are treated as pending
// rather than overdue — the bill pays itself, so it doesn't need attention.
export const calculateBillStatus = (bill: Bill): BillStatus => {
  if (bill.status === 'paid') return 'paid';

  if (!bill.dueDate) return 'pending';

  const today = startOfDay(new Date());
  const dueDate = startOfDay(parseISO(bill.dueDate));
  const daysUntilDue = differenceInDays(dueDate, today);

  if (daysUntilDue < 0) return bill.isAutoDebited ? 'pending' : 'overdue';
  if (daysUntilDue <= 7) return 'due_soon';
  return 'pending';
};

// Calculate next due date based on recurring interval
export const calculateNextDueDate = (currentDueDate: string, interval: RecurringInterval): string => {
  const date = parseISO(currentDueDate);

  switch (interval) {
    case 'weekly':
      return addWeeks(date, 1).toISOString();
    case 'biweekly':
      return addWeeks(date, 2).toISOString();
    case 'monthly':
      return addMonths(date, 1).toISOString();
    case 'quarterly':
      return addMonths(date, 3).toISOString();
    case 'yearly':
      return addYears(date, 1).toISOString();
    default:
      return currentDueDate;
  }
};

// Convert a DB row (snake_case) to a Bill (camelCase)
function rowToBill(row: Record<string, unknown>): Bill {
  const bill = {
    id: row.id as string,
    name: row.name as string,
    amount: row.amount != null ? Number(row.amount) : undefined,
    dueDate: row.due_date as string | undefined,
    isRecurring: row.is_recurring as boolean,
    recurringInterval: row.recurring_interval as RecurringInterval | undefined,
    paymentMethod: row.payment_method as string | undefined,
    paymentCardId: row.payment_card_id as string | undefined,
    category: row.category as BillCategory | string | undefined,
    notes: row.notes as string | undefined,
    isAutoDebited: row.is_auto_debited as boolean | undefined,
    status: row.status as BillStatus,
    paidDate: row.paid_date as string | undefined,
    isSample: row.is_sample as boolean | undefined,
    deletedAt: row.deleted_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  } as Bill;
  bill.status = calculateBillStatus(bill);
  return bill;
}

// Convert a Bill (camelCase) to DB columns (snake_case), excluding id/createdAt/updatedAt
function billToRow(bill: Partial<Bill>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (bill.name !== undefined) row.name = bill.name;
  if (bill.amount !== undefined) row.amount = bill.amount;
  if (bill.dueDate !== undefined) row.due_date = bill.dueDate;
  if (bill.isRecurring !== undefined) row.is_recurring = bill.isRecurring;
  if (bill.recurringInterval !== undefined) row.recurring_interval = bill.recurringInterval;
  if (bill.paymentMethod !== undefined) row.payment_method = bill.paymentMethod || null;
  if (bill.paymentCardId !== undefined) row.payment_card_id = bill.paymentCardId || null;
  if (bill.category !== undefined) row.category = bill.category || null;
  if (bill.notes !== undefined) row.notes = bill.notes || null;
  if (bill.isAutoDebited !== undefined) row.is_auto_debited = bill.isAutoDebited;
  if (bill.status !== undefined) row.status = bill.status;
  if (bill.paidDate !== undefined) row.paid_date = bill.paidDate || null;
  if (bill.isSample !== undefined) row.is_sample = bill.isSample;
  if (bill.deletedAt !== undefined) row.deleted_at = bill.deletedAt || null;
  return row;
}

// In-memory cache — populated by refresh(), read by the synchronous getters.
let cache: Bill[] = [];
let loaded = false;

export class BillService {
  // Fetch all bills from Supabase and populate the cache. Pages call this on
  // mount and after mutations, then read from the synchronous getters.
  static async refresh(): Promise<void> {
    if (isDemoModeActive()) return;
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('household_id', householdId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    cache = (data || []).map(rowToBill);
    loaded = true;
  }

  // Ensures cache is populated. Called by the synchronous getters as a
  // fallback — if refresh hasn't completed yet, returns empty.
  private static ensureLoaded(): Bill[] {
    if (isDemoModeActive()) return demoCache;
    return loaded ? cache : [];
  }

  static getAllBills(): Bill[] {
    return this.ensureLoaded().filter((b) => !b.deletedAt);
  }

  static getBillById(id: string): Bill | undefined {
    return this.getAllBills().find((bill) => bill.id === id);
  }

  static async addBill(billData: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Bill> {
    const householdId = await getHouseholdId();
    const category = billData.category || categorizeByName(billData.name);

    const row = {
      ...billToRow(billData),
      household_id: householdId,
      category,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('bills')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    const newBill = rowToBill(data);
    cache.push(newBill);
    return newBill;
  }

  static async updateBill(id: string, updates: Partial<Bill>): Promise<Bill | undefined> {
    const row = billToRow(updates);
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('bills')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updatedBill = rowToBill(data);
    const index = cache.findIndex((b) => b.id === id);
    if (index !== -1) cache[index] = updatedBill;
    return updatedBill;
  }

  static async markAsPaid(id: string, createNextRecurrence = false): Promise<Bill | undefined> {
    const bill = this.getBillById(id);
    if (!bill) return undefined;

    if (isDemoModeActive()) {
      const idx = demoCache.findIndex((b) => b.id === id);
      if (idx !== -1) {
        demoCache[idx] = { ...demoCache[idx], status: 'paid', paidDate: new Date().toISOString(), updatedAt: new Date().toISOString() };
        return demoCache[idx];
      }
      return undefined;
    }

    const updatedBill = await this.updateBill(id, {
      status: 'paid',
      paidDate: new Date().toISOString(),
    });

    if (createNextRecurrence && bill.isRecurring && bill.dueDate && bill.recurringInterval && bill.recurringInterval !== 'one_time') {
      const nextDueDate = calculateNextDueDate(bill.dueDate, bill.recurringInterval);
      await this.addBill({
        name: bill.name,
        amount: bill.amount,
        dueDate: nextDueDate,
        isRecurring: bill.isRecurring,
        recurringInterval: bill.recurringInterval,
        paymentMethod: bill.paymentMethod,
        category: bill.category,
        notes: bill.notes,
        isAutoDebited: bill.isAutoDebited,
      });
    }

    return updatedBill;
  }

  static async markAsUnpaid(id: string): Promise<Bill | undefined> {
    if (isDemoModeActive()) {
      const idx = demoCache.findIndex((b) => b.id === id);
      if (idx !== -1) {
        demoCache[idx] = { ...demoCache[idx], status: 'pending', paidDate: undefined, updatedAt: new Date().toISOString() };
        return demoCache[idx];
      }
      return undefined;
    }
    return this.updateBill(id, {
      status: 'pending',
      paidDate: undefined,
    });
  }

  static async setAutoDebit(id: string, isAutoDebited: boolean): Promise<Bill | undefined> {
    return this.updateBill(id, { isAutoDebited });
  }

  static getBillsByCategory(): Record<BillCategory, Bill[]> {
    const bills = this.getAllBills().filter((b) => b.status !== 'paid');
    const categories: Record<BillCategory, Bill[]> = {
      utilities: [],
      subscriptions: [],
      insurance: [],
      rent_mortgage: [],
      loans: [],
      services: [],
      other: [],
    };

    bills.forEach((bill) => {
      const cat = (bill.category || 'other') as BillCategory;
      if (categories[cat]) categories[cat].push(bill);
      else categories.other.push(bill);
    });

    return categories;
  }

  static getSpendingByCategory(): Record<BillCategory, number> {
    const bills = this.getAllBills();
    const spending: Record<BillCategory, number> = {
      utilities: 0,
      subscriptions: 0,
      insurance: 0,
      rent_mortgage: 0,
      loans: 0,
      services: 0,
      other: 0,
    };

    bills.forEach((bill) => {
      if (bill.amount) {
        const cat = bill.category as BillCategory | string | undefined;
        if (cat && cat in spending) {
          spending[cat as BillCategory] += bill.amount;
        } else {
          spending.other += bill.amount;
        }
      }
    });

    return spending;
  }

  static getUpcomingTotal(): number {
    return this.getUpcomingBills().reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }

  static getDueSoonBills(): Bill[] {
    return this.getAllBills().filter((b) => b.status === 'due_soon');
  }

  static async deleteBill(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('bills')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    const index = cache.findIndex((b) => b.id === id);
    if (index !== -1) cache[index] = { ...cache[index], deletedAt: new Date().toISOString() };
    return true;
  }

  static getDeletedBills(): Bill[] {
    return this.ensureLoaded().filter((b) => !!b.deletedAt);
  }

  static async restoreBill(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('bills')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
    const index = cache.findIndex((b) => b.id === id);
    if (index !== -1) cache[index] = { ...cache[index], deletedAt: undefined };
    return true;
  }

  static async permanentlyDeleteBill(id: string): Promise<void> {
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) throw error;
    cache = cache.filter((b) => b.id !== id);
  }

  static async clearSampleBills(): Promise<void> {
    const householdId = await getHouseholdId();
    const { error } = await supabase
      .from('bills')
      .delete()
      .eq('household_id', householdId)
      .eq('is_sample', true);

    if (error) throw error;
    cache = cache.filter((b) => !b.isSample);
  }

  static async clearAllBills(): Promise<void> {
    const householdId = await getHouseholdId();
    const { error } = await supabase.from('bills').delete().eq('household_id', householdId);
    if (error) throw error;
    cache = [];
  }

  static getBillsByStatus(): Record<BillStatus, Bill[]> {
    const bills = this.getAllBills();

    return {
      overdue: bills.filter((b) => b.status === 'overdue'),
      due_soon: bills.filter((b) => b.status === 'due_soon'),
      pending: bills.filter((b) => b.status === 'pending'),
      paid: bills.filter((b) => b.status === 'paid'),
    };
  }

  static getUpcomingBills(): Bill[] {
    const bills = this.getAllBills();
    return bills
      .filter((b) => b.status !== 'paid')
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }

  static getBillCount(): number {
    return this.getAllBills().filter((b) => !b.isSample).length;
  }
}
