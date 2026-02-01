// LoanReady Service - Employment, Rental, Income, Assets tracking

import { differenceInMonths, parseISO, isBefore } from 'date-fns';

const LOANREADY_KEY = 'billvie_loanready';
const PIN_KEY = 'billvie_loanready_pin';

export interface EmploymentEntry {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
}

export interface RentalEntry {
  id: string;
  address: string;
  landlord?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
}

export interface IncomeData {
  amount: number;
  type: 'monthly' | 'annual';
  isPreTax: boolean;
}

export interface AssetEntry {
  id: string;
  type: 'property' | 'vehicle' | 'savings' | 'investment' | 'other';
  description: string;
  estimatedValue: number;
}

export interface LoanReadyData {
  employment: EmploymentEntry[];
  rental: RentalEntry[];
  income?: IncomeData;
  assets: AssetEntry[];
  pinHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmploymentGap {
  start: string;
  end: string;
  months: number;
}

const DEFAULT_DATA: LoanReadyData = {
  employment: [],
  rental: [],
  assets: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export class LoanReadyService {
  private static getData(): LoanReadyData {
    const data = localStorage.getItem(LOANREADY_KEY);
    return data ? { ...DEFAULT_DATA, ...JSON.parse(data) } : { ...DEFAULT_DATA };
  }

  private static saveData(data: LoanReadyData): void {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(LOANREADY_KEY, JSON.stringify(data));
  }

  // PIN Management
  static hasPin(): boolean {
    return !!localStorage.getItem(PIN_KEY);
  }

  static setPin(pin: string): void {
    // Simple hash for now (would use proper hashing in production)
    localStorage.setItem(PIN_KEY, btoa(pin));
  }

  static verifyPin(pin: string): boolean {
    const stored = localStorage.getItem(PIN_KEY);
    return stored === btoa(pin);
  }

  static removePin(): void {
    localStorage.removeItem(PIN_KEY);
  }

  // Employment CRUD
  static getEmployment(): EmploymentEntry[] {
    return this.getData().employment.sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }

  static addEmployment(entry: Omit<EmploymentEntry, 'id'>): EmploymentEntry {
    const data = this.getData();
    const newEntry: EmploymentEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    data.employment.push(newEntry);
    this.saveData(data);
    return newEntry;
  }

  static updateEmployment(id: string, updates: Partial<EmploymentEntry>): void {
    const data = this.getData();
    const index = data.employment.findIndex(e => e.id === id);
    if (index !== -1) {
      data.employment[index] = { ...data.employment[index], ...updates };
      this.saveData(data);
    }
  }

  static deleteEmployment(id: string): void {
    const data = this.getData();
    data.employment = data.employment.filter(e => e.id !== id);
    this.saveData(data);
  }

  static getEmploymentSummary(): { totalMonths: number; years: number; months: number; gaps: EmploymentGap[] } {
    const entries = this.getEmployment();
    if (entries.length === 0) return { totalMonths: 0, years: 0, months: 0, gaps: [] };

    let totalMonths = 0;
    const gaps: EmploymentGap[] = [];
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    sortedEntries.forEach((entry, index) => {
      const end = entry.endDate ? parseISO(entry.endDate) : new Date();
      const start = parseISO(entry.startDate);
      totalMonths += differenceInMonths(end, start);

      // Check for gaps
      if (index > 0) {
        const prevEnd = sortedEntries[index - 1].endDate 
          ? parseISO(sortedEntries[index - 1].endDate!)
          : new Date();
        if (isBefore(prevEnd, start)) {
          const gapMonths = differenceInMonths(start, prevEnd);
          if (gapMonths > 0) {
            gaps.push({
              start: sortedEntries[index - 1].endDate || new Date().toISOString(),
              end: entry.startDate,
              months: gapMonths,
            });
          }
        }
      }
    });

    return {
      totalMonths,
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
      gaps,
    };
  }

  // Rental CRUD
  static getRental(): RentalEntry[] {
    return this.getData().rental.sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }

  static addRental(entry: Omit<RentalEntry, 'id'>): RentalEntry {
    const data = this.getData();
    const newEntry: RentalEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    data.rental.push(newEntry);
    this.saveData(data);
    return newEntry;
  }

  static updateRental(id: string, updates: Partial<RentalEntry>): void {
    const data = this.getData();
    const index = data.rental.findIndex(r => r.id === id);
    if (index !== -1) {
      data.rental[index] = { ...data.rental[index], ...updates };
      this.saveData(data);
    }
  }

  static deleteRental(id: string): void {
    const data = this.getData();
    data.rental = data.rental.filter(r => r.id !== id);
    this.saveData(data);
  }

  static getRentalSummary(): { totalMonths: number; years: number; months: number } {
    const entries = this.getRental();
    if (entries.length === 0) return { totalMonths: 0, years: 0, months: 0 };

    let totalMonths = 0;
    entries.forEach(entry => {
      const end = entry.endDate ? parseISO(entry.endDate) : new Date();
      const start = parseISO(entry.startDate);
      totalMonths += differenceInMonths(end, start);
    });

    return {
      totalMonths,
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
    };
  }

  // Income
  static getIncome(): IncomeData | undefined {
    return this.getData().income;
  }

  static setIncome(income: IncomeData): void {
    const data = this.getData();
    data.income = income;
    this.saveData(data);
  }

  static getIncomeFormatted(): { monthly: number; annual: number } | null {
    const income = this.getIncome();
    if (!income) return null;

    if (income.type === 'monthly') {
      return { monthly: income.amount, annual: income.amount * 12 };
    }
    return { monthly: income.amount / 12, annual: income.amount };
  }

  // Assets CRUD
  static getAssets(): AssetEntry[] {
    return this.getData().assets;
  }

  static addAsset(entry: Omit<AssetEntry, 'id'>): AssetEntry {
    const data = this.getData();
    const newEntry: AssetEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    data.assets.push(newEntry);
    this.saveData(data);
    return newEntry;
  }

  static updateAsset(id: string, updates: Partial<AssetEntry>): void {
    const data = this.getData();
    const index = data.assets.findIndex(a => a.id === id);
    if (index !== -1) {
      data.assets[index] = { ...data.assets[index], ...updates };
      this.saveData(data);
    }
  }

  static deleteAsset(id: string): void {
    const data = this.getData();
    data.assets = data.assets.filter(a => a.id !== id);
    this.saveData(data);
  }

  static getTotalAssetValue(): number {
    return this.getAssets().reduce((sum, a) => sum + a.estimatedValue, 0);
  }

  // Clear all data
  static clearAll(): void {
    localStorage.removeItem(LOANREADY_KEY);
    localStorage.removeItem(PIN_KEY);
  }

  // Inject test data
  static injectTestData(): void {
    const data: LoanReadyData = {
      employment: [
        {
          id: crypto.randomUUID(),
          company: 'Tech Corp',
          position: 'Senior Developer',
          startDate: '2022-03-01',
          isCurrent: true,
        },
        {
          id: crypto.randomUUID(),
          company: 'StartupXYZ',
          position: 'Developer',
          startDate: '2019-06-15',
          endDate: '2022-01-15',
          isCurrent: false,
        },
      ],
      rental: [
        {
          id: crypto.randomUUID(),
          address: '123 Main St, Sydney NSW 2000',
          landlord: 'John Smith',
          startDate: '2021-01-01',
          isCurrent: true,
        },
        {
          id: crypto.randomUUID(),
          address: '456 Oak Ave, Melbourne VIC 3000',
          landlord: 'Jane Doe',
          startDate: '2018-06-01',
          endDate: '2020-12-15',
          isCurrent: false,
        },
      ],
      income: {
        amount: 8500,
        type: 'monthly',
        isPreTax: true,
      },
      assets: [
        {
          id: crypto.randomUUID(),
          type: 'savings',
          description: 'Emergency Fund',
          estimatedValue: 25000,
        },
        {
          id: crypto.randomUUID(),
          type: 'vehicle',
          description: '2020 Toyota Camry',
          estimatedValue: 28000,
        },
        {
          id: crypto.randomUUID(),
          type: 'investment',
          description: 'Share Portfolio',
          estimatedValue: 45000,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LOANREADY_KEY, JSON.stringify(data));
  }
}
