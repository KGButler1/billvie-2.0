// Financial Info Service - Insurance, Superannuation, Misc tracking

const FINANCIAL_KEY = 'billvie_financial';

export type InsuranceType = 'auto' | 'home' | 'life' | 'health' | 'travel' | 'other';

export interface InsuranceEntry {
  id: string;
  provider: string;
  policyNumber?: string;
  type: InsuranceType;
  premium: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'annual';
  renewalDate?: string;
  documentLink?: string;
  notes?: string;
  linkedBillId?: string;
}

export interface SuperannuationEntry {
  id: string;
  fundName: string;
  accountNumber?: string;
  estimatedBalance: number;
  notes?: string;
}

export interface MiscFinancialEntry {
  id: string;
  key: string;
  value: string;
  notes?: string;
}

export interface IncomeSourceEntry {
  id: string;
  sourceName: string;
  approximateAmount: number;
  notes?: string;
}

export type DebtType = 'mortgage' | 'car' | 'personal' | 'other';

export interface DebtEntry {
  id: string;
  lenderName: string;
  type: DebtType;
  approximateBalance: number;
  notes?: string;
}

export interface FinancialData {
  insurance: InsuranceEntry[];
  superannuation: SuperannuationEntry[];
  income: IncomeSourceEntry[];
  debts: DebtEntry[];
  misc: MiscFinancialEntry[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_DATA: FinancialData = {
  insurance: [],
  superannuation: [],
  income: [],
  debts: [],
  misc: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  auto: 'Auto Insurance',
  home: 'Home Insurance',
  life: 'Life Insurance',
  health: 'Health Insurance',
  travel: 'Travel Insurance',
  other: 'Other',
};

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  mortgage: 'Mortgage',
  car: 'Car Loan',
  personal: 'Personal Loan',
  other: 'Other',
};

export class FinancialInfoService {
  private static getData(): FinancialData {
    const data = localStorage.getItem(FINANCIAL_KEY);
    return data ? { ...DEFAULT_DATA, ...JSON.parse(data) } : { ...DEFAULT_DATA };
  }

  private static saveData(data: FinancialData): void {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(FINANCIAL_KEY, JSON.stringify(data));
  }

  // Insurance CRUD
  static getInsurance(): InsuranceEntry[] {
    return this.getData().insurance;
  }

  static addInsurance(entry: Omit<InsuranceEntry, 'id'>): InsuranceEntry {
    const data = this.getData();
    const newEntry: InsuranceEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    data.insurance.push(newEntry);
    this.saveData(data);
    return newEntry;
  }

  static updateInsurance(id: string, updates: Partial<InsuranceEntry>): void {
    const data = this.getData();
    const index = data.insurance.findIndex(i => i.id === id);
    if (index !== -1) {
      data.insurance[index] = { ...data.insurance[index], ...updates };
      this.saveData(data);
    }
  }

  static deleteInsurance(id: string): void {
    const data = this.getData();
    data.insurance = data.insurance.filter(i => i.id !== id);
    this.saveData(data);
  }

  static getTotalAnnualPremiums(): number {
    return this.getInsurance().reduce((sum, ins) => {
      switch (ins.premiumFrequency) {
        case 'monthly': return sum + (ins.premium * 12);
        case 'quarterly': return sum + (ins.premium * 4);
        case 'annual': return sum + ins.premium;
        default: return sum;
      }
    }, 0);
  }

  // Superannuation CRUD
  static getSuperannuation(): SuperannuationEntry[] {
    return this.getData().superannuation;
  }

  static addSuperannuation(entry: Omit<SuperannuationEntry, 'id'>): SuperannuationEntry {
    const data = this.getData();
    const newEntry: SuperannuationEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    data.superannuation.push(newEntry);
    this.saveData(data);
    return newEntry;
  }

  static updateSuperannuation(id: string, updates: Partial<SuperannuationEntry>): void {
    const data = this.getData();
    const index = data.superannuation.findIndex(s => s.id === id);
    if (index !== -1) {
      data.superannuation[index] = { ...data.superannuation[index], ...updates };
      this.saveData(data);
    }
  }

  static deleteSuperannuation(id: string): void {
    const data = this.getData();
    data.superannuation = data.superannuation.filter(s => s.id !== id);
    this.saveData(data);
  }

  static getTotalSuperBalance(): number {
    return this.getSuperannuation().reduce((sum, s) => sum + s.estimatedBalance, 0);
  }

  // Misc CRUD
  static getMisc(): MiscFinancialEntry[] {
    return this.getData().misc;
  }

  static addMisc(entry: Omit<MiscFinancialEntry, 'id'>): MiscFinancialEntry {
    const data = this.getData();
    const newEntry: MiscFinancialEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    data.misc.push(newEntry);
    this.saveData(data);
    return newEntry;
  }

  static updateMisc(id: string, updates: Partial<MiscFinancialEntry>): void {
    const data = this.getData();
    const index = data.misc.findIndex(m => m.id === id);
    if (index !== -1) {
      data.misc[index] = { ...data.misc[index], ...updates };
      this.saveData(data);
    }
  }

  static deleteMisc(id: string): void {
    const data = this.getData();
    data.misc = data.misc.filter(m => m.id !== id);
    this.saveData(data);
  }

  // Income Sources CRUD
  static getIncome(): IncomeSourceEntry[] {
    return this.getData().income || [];
  }

  static addIncome(entry: Omit<IncomeSourceEntry, 'id'>): IncomeSourceEntry {
    const data = this.getData();
    const newEntry: IncomeSourceEntry = { ...entry, id: crypto.randomUUID() };
    data.income = [...(data.income || []), newEntry];
    this.saveData(data);
    return newEntry;
  }

  static updateIncome(id: string, updates: Partial<IncomeSourceEntry>): void {
    const data = this.getData();
    const index = (data.income || []).findIndex(i => i.id === id);
    if (index !== -1) {
      data.income[index] = { ...data.income[index], ...updates };
      this.saveData(data);
    }
  }

  static deleteIncome(id: string): void {
    const data = this.getData();
    data.income = (data.income || []).filter(i => i.id !== id);
    this.saveData(data);
  }

  // Debts & Loans CRUD
  static getDebts(): DebtEntry[] {
    return this.getData().debts || [];
  }

  static addDebt(entry: Omit<DebtEntry, 'id'>): DebtEntry {
    const data = this.getData();
    const newEntry: DebtEntry = { ...entry, id: crypto.randomUUID() };
    data.debts = [...(data.debts || []), newEntry];
    this.saveData(data);
    return newEntry;
  }

  static updateDebt(id: string, updates: Partial<DebtEntry>): void {
    const data = this.getData();
    const index = (data.debts || []).findIndex(d => d.id === id);
    if (index !== -1) {
      data.debts[index] = { ...data.debts[index], ...updates };
      this.saveData(data);
    }
  }

  static deleteDebt(id: string): void {
    const data = this.getData();
    data.debts = (data.debts || []).filter(d => d.id !== id);
    this.saveData(data);
  }


  // Clear all data
  static clearAll(): void {
    localStorage.removeItem(FINANCIAL_KEY);
  }

  // Inject test data
  static injectTestData(): void {
    const data: FinancialData = {
      insurance: [
        {
          id: crypto.randomUUID(),
          provider: 'AAMI',
          policyNumber: 'POL-123456',
          type: 'auto',
          premium: 125,
          premiumFrequency: 'monthly',
          renewalDate: '2026-06-15',
          notes: 'Comprehensive coverage for Toyota Camry',
        },
        {
          id: crypto.randomUUID(),
          provider: 'Medibank',
          type: 'health',
          premium: 380,
          premiumFrequency: 'monthly',
          renewalDate: '2026-03-01',
        },
      ],
      superannuation: [
        {
          id: crypto.randomUUID(),
          fundName: 'Australian Super',
          accountNumber: '12345678',
          estimatedBalance: 85000,
        },
      ],
      income: [
        {
          id: crypto.randomUUID(),
          sourceName: 'Primary salary',
          approximateAmount: 8200,
          notes: 'Monthly, direct deposit to joint account',
        },
      ],
      debts: [
        {
          id: crypto.randomUUID(),
          lenderName: 'Commonwealth Bank',
          type: 'mortgage',
          approximateBalance: 415000,
          notes: 'Refinanced 2024, autopay from checking',
        },
      ],
      misc: [
        {
          id: crypto.randomUUID(),
          key: 'Tax File Number',
          value: '*** *** ***',
          notes: 'Stored securely',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(FINANCIAL_KEY, JSON.stringify(data));
  }
}
