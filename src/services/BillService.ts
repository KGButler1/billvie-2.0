import { Bill, BillStatus } from '@/types/bill';
import { differenceInDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

const STORAGE_KEY = 'billvie_bills';
const SAMPLE_DATA_SHOWN_KEY = 'billvie_sample_shown';

// Generate unique ID
const generateId = (): string => {
  return `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate bill status based on due date and payment status
export const calculateBillStatus = (bill: Bill): BillStatus => {
  if (bill.status === 'paid') return 'paid';
  
  if (!bill.dueDate) return 'pending';
  
  const today = startOfDay(new Date());
  const dueDate = startOfDay(parseISO(bill.dueDate));
  const daysUntilDue = differenceInDays(dueDate, today);
  
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'due_soon';
  return 'pending';
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
      status: 'paid',
      paidDate: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString(),
      isSample: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
};

export class BillService {
  // Initialize with sample data if first visit
  static initialize(): void {
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

  // Get all bills
  static getAllBills(): Bill[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const bills: Bill[] = JSON.parse(data);
    // Recalculate status for each bill
    return bills.map(bill => ({
      ...bill,
      status: calculateBillStatus(bill),
    }));
  }

  // Get bill by ID
  static getBillById(id: string): Bill | undefined {
    const bills = this.getAllBills();
    return bills.find(bill => bill.id === id);
  }

  // Add new bill
  static addBill(billData: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Bill {
    const now = new Date().toISOString();
    const newBill: Bill = {
      ...billData,
      id: generateId(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    
    // Calculate actual status
    newBill.status = calculateBillStatus(newBill);
    
    const bills = this.getAllBills();
    bills.push(newBill);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    
    return newBill;
  }

  // Update bill
  static updateBill(id: string, updates: Partial<Bill>): Bill | undefined {
    const bills = this.getAllBills();
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
  static markAsPaid(id: string): Bill | undefined {
    return this.updateBill(id, {
      status: 'paid',
      paidDate: new Date().toISOString(),
    });
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

  // Delete bill
  static deleteBill(id: string): boolean {
    const bills = this.getAllBills();
    const filteredBills = bills.filter(bill => bill.id !== id);
    
    if (filteredBills.length === bills.length) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredBills));
    return true;
  }

  // Clear sample bills
  static clearSampleBills(): void {
    const bills = this.getAllBills().filter(bill => !bill.isSample);
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
    
    const existingBills = this.getAllBills();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existingBills, ...testBills]));
  }
}
