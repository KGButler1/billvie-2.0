import { Bill, BillStatus, BillCategory, RecurringInterval } from '@/types/bill';
import { differenceInDays, parseISO, startOfDay, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { categorizeByName } from '@/utils/billCategorizer';

const STORAGE_KEY = 'billvie_bills';
const SAMPLE_DATA_SHOWN_KEY = 'billvie_sample_shown';

// Generate unique ID
const generateId = (): string => {
  return `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate bill status based on due date and payment status.
// Auto-debited bills that have passed their due date are treated as pending
// rather than overdue — the bill pays itself, so it doesn't need attention.
// The caller (e.g. BillList) can still surface them if the linked card is expired.
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

// Get sample bills for first-time users
const getSampleBills = (): Bill[] => {
  const today = new Date();
  
  return [
    {
      id: generateId(),
      name: 'Electric Bill',
      amount: 142.50,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5).toISOString(),
      isRecurring: true,
      recurringInterval: 'monthly',
      paymentMethod: 'direct_debit',
      category: 'utilities',
      status: 'due_soon',
      isSample: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: 'Internet Service',
      amount: 79.99,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12).toISOString(),
      isRecurring: true,
      recurringInterval: 'monthly',
      paymentMethod: 'credit_card',
      category: 'services',
      status: 'pending',
      isSample: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: 'Phone Plan',
      amount: 45.00,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2).toISOString(),
      isRecurring: true,
      recurringInterval: 'monthly',
      paymentMethod: 'credit_card',
      category: 'services',
      status: 'overdue',
      isSample: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: 'Netflix',
      amount: 15.99,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20).toISOString(),
      isRecurring: true,
      recurringInterval: 'monthly',
      paymentMethod: 'credit_card',
      category: 'subscriptions',
      status: 'pending',
      isSample: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: 'Car Insurance',
      amount: 180.00,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).toISOString(),
      isRecurring: true,
      recurringInterval: 'monthly',
      paymentMethod: 'transfer',
      category: 'insurance',
      status: 'due_soon',
      isSample: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: 'Rent',
      amount: 1500.00,
      dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString(),
      isRecurring: true,
      recurringInterval: 'monthly',
      paymentMethod: 'transfer',
      category: 'rent_mortgage',
      status: 'paid',
      paidDate: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString(),
      isSample: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
};

// Retired `responsibleParty` → notes. Runs once, guarded by a key, wrapped in
// try/catch, legacy localStorage keys deliberately left in place.
const RESPONSIBLE_MIGRATED_KEY = 'billvie_bill_responsible_migrated_v1';
const LEGACY_CUSTOM_PARTIES_KEY = 'billvie_custom_responsible_parties';
const LEGACY_PARTY_LABELS: Record<string, string> = {
  me: 'Me',
  partner: 'Partner',
  roommate: 'Roommate',
  parent: 'Parent',
  other: 'Other',
};

const runResponsiblePartyMigration = (): void => {
  if (localStorage.getItem(RESPONSIBLE_MIGRATED_KEY) === 'true') return;

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const bills: Bill[] = data ? JSON.parse(data) : [];

    let customOptions: { id: string; label: string }[] = [];
    try {
      const rawCustom = localStorage.getItem(LEGACY_CUSTOM_PARTIES_KEY);
      customOptions = rawCustom ? JSON.parse(rawCustom) : [];
    } catch {
      customOptions = [];
    }

    bills.forEach((bill) => {
      const record = bill as unknown as Record<string, unknown>;
      const value = record.responsibleParty;
      if (typeof value !== 'string' || !value.trim()) {
        delete record.responsibleParty;
        return;
      }

      const label =
        LEGACY_PARTY_LABELS[value] ||
        customOptions.find((o) => o.id === value)?.label ||
        value;

      const line = `Previously marked as: ${label}`;
      bill.notes = bill.notes && bill.notes.trim() ? `${bill.notes}\n\n${line}` : line;
      delete record.responsibleParty;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  } catch {
    // A broken payload must never block the app.
  }

  localStorage.setItem(RESPONSIBLE_MIGRATED_KEY, 'true');
};

export class BillService {
  // Initialize with sample data if first visit
  static initialize(): void {
    runResponsiblePartyMigration();

    const sampleShown = localStorage.getItem(SAMPLE_DATA_SHOWN_KEY);
    if (!sampleShown) {
      const existingBills = this.getAllBills();
      if (existingBills.length === 0) {
        const sampleBills = getSampleBills();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleBills));
        localStorage.setItem(SAMPLE_DATA_SHOWN_KEY, 'true');
      }
    }
  }


  // Raw getter — includes soft-deleted bills. Every read-modify-write cycle
  // in this service MUST use this, never getAllBills(), or soft-deleted bills
  // would be silently erased on the next write.
  private static getRawBills(): Bill[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const bills: Bill[] = JSON.parse(data);

    // Self-cleaning: purge anything deleted more than 30 days ago
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const kept = bills.filter(b => !b.deletedAt || new Date(b.deletedAt).getTime() > cutoff);
    if (kept.length !== bills.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    }

    // Recalculate status for each bill
    return kept.map(bill => ({
      ...bill,
      status: calculateBillStatus(bill),
    }));
  }

  // Get all bills (excludes soft-deleted)
  static getAllBills(): Bill[] {
    return this.getRawBills().filter(b => !b.deletedAt);
  }

  // Get bill by ID
  static getBillById(id: string): Bill | undefined {
    const bills = this.getAllBills();
    return bills.find(bill => bill.id === id);
  }

  // Add new bill
  static addBill(billData: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Bill {
    const now = new Date().toISOString();
    
    // Auto-categorize if no category provided
    const category = billData.category || categorizeByName(billData.name);
    
    const newBill: Bill = {
      ...billData,
      id: generateId(),
      category,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    
    // Calculate actual status
    newBill.status = calculateBillStatus(newBill);
    
    const bills = this.getRawBills();
    bills.push(newBill);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    
    return newBill;
  }

  // Update bill
  static updateBill(id: string, updates: Partial<Bill>): Bill | undefined {
    const bills = this.getRawBills();
    const index = bills.findIndex(bill => bill.id === id);
    
    if (index === -1) return undefined;
    
    const updatedBill: Bill = {
      ...bills[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // Recalculate status
    updatedBill.status = calculateBillStatus(updatedBill);
    
    bills[index] = updatedBill;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    
    return updatedBill;
  }

  // Mark bill as paid
  static markAsPaid(id: string, createNextRecurrence: boolean = false): Bill | undefined {
    const bill = this.getBillById(id);
    if (!bill) return undefined;
    
    const updatedBill = this.updateBill(id, {
      status: 'paid',
      paidDate: new Date().toISOString(),
    });
    
    // If recurring and should create next occurrence
    if (createNextRecurrence && bill.isRecurring && bill.dueDate && bill.recurringInterval && bill.recurringInterval !== 'one_time') {
      const nextDueDate = calculateNextDueDate(bill.dueDate, bill.recurringInterval);
      this.addBill({
        name: bill.name,
        amount: bill.amount,
        dueDate: nextDueDate,
        isRecurring: bill.isRecurring,
        recurringInterval: bill.recurringInterval,
        paymentMethod: bill.paymentMethod,
        category: bill.category,
        notes: bill.notes,
        taggedPersonIds: bill.taggedPersonIds,

        isAutoDebited: bill.isAutoDebited,
      });
    }
    
    return updatedBill;
  }

  // Mark bill as unpaid
  static markAsUnpaid(id: string): Bill | undefined {
    const bill = this.getBillById(id);
    if (!bill) return undefined;
    
    const updatedBill = this.updateBill(id, {
      status: 'pending',
      paidDate: undefined,
    });
    
    return updatedBill;
  }

  // Set auto-debit status
  static setAutoDebit(id: string, isAutoDebited: boolean): Bill | undefined {
    return this.updateBill(id, { isAutoDebited });
  }

  // Get bills by category
  static getBillsByCategory(): Record<BillCategory, Bill[]> {
    const bills = this.getAllBills().filter(b => b.status !== 'paid');
    const categories: Record<BillCategory, Bill[]> = {
      utilities: [],
      subscriptions: [],
      insurance: [],
      rent_mortgage: [],
      loans: [],
      services: [],
      other: [],
    };
    
    bills.forEach(bill => {
      const cat = bill.category || 'other';
      categories[cat].push(bill);
    });
    
    return categories;
  }

  // Get spending by category for current month
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
    
    bills.forEach(bill => {
      if (bill.amount) {
        const cat = bill.category || 'other';
        spending[cat] += bill.amount;
      }
    });
    
    return spending;
  }

  // Get upcoming total
  static getUpcomingTotal(): number {
    return this.getUpcomingBills().reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }

  // Get due soon bills (within 7 days)
  static getDueSoonBills(): Bill[] {
    return this.getAllBills().filter(b => b.status === 'due_soon');
  }

  // Soft-delete bill (recoverable from Recently Deleted for 30 days)
  static deleteBill(id: string): boolean {
    const bills = this.getRawBills();
    const index = bills.findIndex(bill => bill.id === id);

    if (index === -1) return false;

    bills[index] = { ...bills[index], deletedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    return true;
  }

  // Get soft-deleted bills
  static getDeletedBills(): Bill[] {
    return this.getRawBills().filter(b => !!b.deletedAt);
  }

  // Restore a soft-deleted bill
  static restoreBill(id: string): boolean {
    const bills = this.getRawBills();
    const index = bills.findIndex(bill => bill.id === id);

    if (index === -1) return false;

    bills[index] = { ...bills[index], deletedAt: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    return true;
  }

  // Permanently remove a bill
  static permanentlyDeleteBill(id: string): void {
    const bills = this.getRawBills().filter(bill => bill.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  }

  // Clear sample bills
  static clearSampleBills(): void {
    const bills = this.getRawBills().filter(bill => !bill.isSample);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  }

  // Clear all bills
  static clearAllBills(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SAMPLE_DATA_SHOWN_KEY);
  }

  // Get bills grouped by status
  static getBillsByStatus(): Record<BillStatus, Bill[]> {
    const bills = this.getAllBills();
    
    return {
      overdue: bills.filter(b => b.status === 'overdue'),
      due_soon: bills.filter(b => b.status === 'due_soon'),
      pending: bills.filter(b => b.status === 'pending'),
      paid: bills.filter(b => b.status === 'paid'),
    };
  }

  // Get upcoming bills (next 30 days, unpaid)
  static getUpcomingBills(): Bill[] {
    const bills = this.getAllBills();
    return bills
      .filter(b => b.status !== 'paid')
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }

  // Get bill count
  static getBillCount(): number {
    return this.getAllBills().filter(b => !b.isSample).length;
  }

  // Inject test bills (for dev panel)
  static injectTestBills(count: number = 5): void {
    const today = new Date();
    const testBills: Bill[] = [];
    
    const names = ['Water Bill', 'Gas Bill', 'Gym Membership', 'Spotify', 'Hulu', 'Adobe CC', 'AWS', 'Notion', 'Figma', 'Slack'];
    
    for (let i = 0; i < count; i++) {
      const randomDays = Math.floor(Math.random() * 60) - 15; // -15 to +45 days
      testBills.push({
        id: generateId(),
        name: names[i % names.length],
        amount: Math.floor(Math.random() * 200) + 10,
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + randomDays).toISOString(),
        isRecurring: Math.random() > 0.3,
        recurringInterval: 'monthly',
        paymentMethod: 'credit_card',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    const existingBills = this.getRawBills();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existingBills, ...testBills]));
  }
}
