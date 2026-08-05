import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

export type InsuranceType = 'auto' | 'home' | 'life' | 'health' | 'travel' | 'other';
export type DebtType = 'mortgage' | 'car' | 'personal' | 'other';

export interface InsuranceEntry {
  id: string;
  provider: string;
  policyNumber?: string;
  type: InsuranceType;
  premium?: number;
  premiumFrequency?: 'monthly' | 'quarterly' | 'annual';
  renewalDate?: string;
  documentLink?: string;
  notes?: string;
  linkedBillId?: string;
  contactInfo?: string;
}

export interface SuperannuationEntry {
  id: string;
  fundName: string;
  accountNumber?: string;
  estimatedBalance: number;
  notes?: string;
  contactInfo?: string;
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

export interface DebtEntry {
  id: string;
  owedTo: string;
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
  personal: 'Personal loan / owed to someone',
  other: 'Other',
};

const now = () => new Date().toISOString();

export class FinancialInfoService {
  private static insuranceCache: InsuranceEntry[] = [];
  private static superCache: SuperannuationEntry[] = [];
  private static incomeCache: IncomeSourceEntry[] = [];
  private static debtCache: DebtEntry[] = [];
  private static miscCache: MiscFinancialEntry[] = [];
  private static loaded = false;

  static async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const [insRes, supRes, incRes, debtRes, miscRes] = await Promise.all([
      supabase.from('financial_insurance').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
      supabase.from('financial_superannuation').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
      supabase.from('financial_income').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
      supabase.from('financial_debts').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
      supabase.from('financial_misc').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
    ]);

    if (insRes.error) throw insRes.error;
    if (supRes.error) throw supRes.error;
    if (incRes.error) throw incRes.error;
    if (debtRes.error) throw debtRes.error;
    if (miscRes.error) throw miscRes.error;

    this.insuranceCache = (insRes.data || []).map((r) => ({
      id: r.id, provider: r.provider, policyNumber: r.policy_number || undefined,
      type: r.type, premium: r.premium != null ? Number(r.premium) : undefined,
      premiumFrequency: r.premium_frequency || undefined, renewalDate: r.renewal_date || undefined,
      documentLink: r.document_link || undefined, notes: r.notes || undefined,
      linkedBillId: r.linked_bill_id || undefined, contactInfo: r.contact_info || undefined,
    }));
    this.superCache = (supRes.data || []).map((r) => ({
      id: r.id, fundName: r.fund_name, accountNumber: r.account_number || undefined,
      estimatedBalance: Number(r.estimated_balance), notes: r.notes || undefined,
      contactInfo: r.contact_info || undefined,
    }));
    this.incomeCache = (incRes.data || []).map((r) => ({
      id: r.id, sourceName: r.source_name, approximateAmount: Number(r.approximate_amount),
      notes: r.notes || undefined,
    }));
    this.debtCache = (debtRes.data || []).map((r) => ({
      id: r.id, owedTo: r.owed_to, type: r.type, approximateBalance: Number(r.approximate_balance),
      notes: r.notes || undefined,
    }));
    this.miscCache = (miscRes.data || []).map((r) => ({
      id: r.id, key: r.key, value: r.value, notes: r.notes || undefined,
    }));
    this.loaded = true;
  }

  private static ensureLoaded() {
    return this.loaded;
  }

  // Insurance
  static getInsurance(): InsuranceEntry[] {
    return this.ensureLoaded() ? this.insuranceCache : [];
  }

  static async addInsurance(entry: Omit<InsuranceEntry, 'id'>): Promise<InsuranceEntry> {
    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId, provider: entry.provider,
      policy_number: entry.policyNumber || null, type: entry.type,
      premium: entry.premium ?? null, premium_frequency: entry.premiumFrequency || null,
      renewal_date: entry.renewalDate || null, document_link: entry.documentLink || null,
      notes: entry.notes || null, linked_bill_id: entry.linkedBillId || null,
      contact_info: entry.contactInfo || null,
    };
    const { data, error } = await supabase.from('financial_insurance').insert(row).select().single();
    if (error) throw error;
    const newEntry: InsuranceEntry = {
      id: data.id, provider: data.provider, policyNumber: data.policy_number || undefined,
      type: data.type, premium: data.premium != null ? Number(data.premium) : undefined,
      premiumFrequency: data.premium_frequency || undefined, renewalDate: data.renewal_date || undefined,
      documentLink: data.document_link || undefined, notes: data.notes || undefined,
      linkedBillId: data.linked_bill_id || undefined, contactInfo: data.contact_info || undefined,
    };
    this.insuranceCache.push(newEntry);
    return newEntry;
  }

  static async updateInsurance(id: string, updates: Partial<InsuranceEntry>): Promise<void> {
    const row: Record<string, unknown> = { updated_at: now() };
    if (updates.provider !== undefined) row.provider = updates.provider;
    if (updates.policyNumber !== undefined) row.policy_number = updates.policyNumber || null;
    if (updates.type !== undefined) row.type = updates.type;
    if (updates.premium !== undefined) row.premium = updates.premium;
    if (updates.premiumFrequency !== undefined) row.premium_frequency = updates.premiumFrequency || null;
    if (updates.renewalDate !== undefined) row.renewal_date = updates.renewalDate || null;
    if (updates.documentLink !== undefined) row.document_link = updates.documentLink || null;
    if (updates.notes !== undefined) row.notes = updates.notes || null;
    if (updates.linkedBillId !== undefined) row.linked_bill_id = updates.linkedBillId || null;
    if (updates.contactInfo !== undefined) row.contact_info = updates.contactInfo || null;
    const { error } = await supabase.from('financial_insurance').update(row).eq('id', id);
    if (error) throw error;
    const idx = this.insuranceCache.findIndex((i) => i.id === id);
    if (idx !== -1) this.insuranceCache[idx] = { ...this.insuranceCache[idx], ...updates };
  }

  static async deleteInsurance(id: string): Promise<void> {
    const { error } = await supabase.from('financial_insurance').delete().eq('id', id);
    if (error) throw error;
    this.insuranceCache = this.insuranceCache.filter((i) => i.id !== id);
  }

  static getTotalAnnualPremiums(): number {
    return this.getInsurance().reduce((sum, ins) => {
      const premium = ins.premium ?? 0;
      switch (ins.premiumFrequency) {
        case 'monthly': return sum + (premium * 12);
        case 'quarterly': return sum + (premium * 4);
        case 'annual': return sum + premium;
        default: return sum;
      }
    }, 0);
  }

  // Superannuation
  static getSuperannuation(): SuperannuationEntry[] {
    return this.ensureLoaded() ? this.superCache : [];
  }

  static async addSuperannuation(entry: Omit<SuperannuationEntry, 'id'>): Promise<SuperannuationEntry> {
    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId, fund_name: entry.fundName,
      account_number: entry.accountNumber || null, estimated_balance: entry.estimatedBalance,
      notes: entry.notes || null, contact_info: entry.contactInfo || null,
    };
    const { data, error } = await supabase.from('financial_superannuation').insert(row).select().single();
    if (error) throw error;
    const newEntry: SuperannuationEntry = {
      id: data.id, fundName: data.fund_name, accountNumber: data.account_number || undefined,
      estimatedBalance: Number(data.estimated_balance), notes: data.notes || undefined,
      contactInfo: data.contact_info || undefined,
    };
    this.superCache.push(newEntry);
    return newEntry;
  }

  static async updateSuperannuation(id: string, updates: Partial<SuperannuationEntry>): Promise<void> {
    const row: Record<string, unknown> = { updated_at: now() };
    if (updates.fundName !== undefined) row.fund_name = updates.fundName;
    if (updates.accountNumber !== undefined) row.account_number = updates.accountNumber || null;
    if (updates.estimatedBalance !== undefined) row.estimated_balance = updates.estimatedBalance;
    if (updates.notes !== undefined) row.notes = updates.notes || null;
    if (updates.contactInfo !== undefined) row.contact_info = updates.contactInfo || null;
    const { error } = await supabase.from('financial_superannuation').update(row).eq('id', id);
    if (error) throw error;
    const idx = this.superCache.findIndex((s) => s.id === id);
    if (idx !== -1) this.superCache[idx] = { ...this.superCache[idx], ...updates };
  }

  static async deleteSuperannuation(id: string): Promise<void> {
    const { error } = await supabase.from('financial_superannuation').delete().eq('id', id);
    if (error) throw error;
    this.superCache = this.superCache.filter((s) => s.id !== id);
  }

  static getTotalSuperBalance(): number {
    return this.getSuperannuation().reduce((sum, s) => sum + s.estimatedBalance, 0);
  }

  // Income
  static getIncome(): IncomeSourceEntry[] {
    return this.ensureLoaded() ? this.incomeCache : [];
  }

  static async addIncome(entry: Omit<IncomeSourceEntry, 'id'>): Promise<IncomeSourceEntry> {
    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId, source_name: entry.sourceName,
      approximate_amount: entry.approximateAmount, notes: entry.notes || null,
    };
    const { data, error } = await supabase.from('financial_income').insert(row).select().single();
    if (error) throw error;
    const newEntry: IncomeSourceEntry = {
      id: data.id, sourceName: data.source_name, approximateAmount: Number(data.approximate_amount),
      notes: data.notes || undefined,
    };
    this.incomeCache.push(newEntry);
    return newEntry;
  }

  static async updateIncome(id: string, updates: Partial<IncomeSourceEntry>): Promise<void> {
    const row: Record<string, unknown> = { updated_at: now() };
    if (updates.sourceName !== undefined) row.source_name = updates.sourceName;
    if (updates.approximateAmount !== undefined) row.approximate_amount = updates.approximateAmount;
    if (updates.notes !== undefined) row.notes = updates.notes || null;
    const { error } = await supabase.from('financial_income').update(row).eq('id', id);
    if (error) throw error;
    const idx = this.incomeCache.findIndex((i) => i.id === id);
    if (idx !== -1) this.incomeCache[idx] = { ...this.incomeCache[idx], ...updates };
  }

  static async deleteIncome(id: string): Promise<void> {
    const { error } = await supabase.from('financial_income').delete().eq('id', id);
    if (error) throw error;
    this.incomeCache = this.incomeCache.filter((i) => i.id !== id);
  }

  static getTotalIncome(): number {
    return this.getIncome().reduce((sum, i) => sum + (i.approximateAmount || 0), 0);
  }

  // Debts
  static getDebts(): DebtEntry[] {
    return this.ensureLoaded() ? this.debtCache : [];
  }

  static async addDebt(entry: Omit<DebtEntry, 'id'>): Promise<DebtEntry> {
    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId, owed_to: entry.owedTo, type: entry.type,
      approximate_balance: entry.approximateBalance, notes: entry.notes || null,
    };
    const { data, error } = await supabase.from('financial_debts').insert(row).select().single();
    if (error) throw error;
    const newEntry: DebtEntry = {
      id: data.id, owedTo: data.owed_to, type: data.type,
      approximateBalance: Number(data.approximate_balance), notes: data.notes || undefined,
    };
    this.debtCache.push(newEntry);
    return newEntry;
  }

  static async updateDebt(id: string, updates: Partial<DebtEntry>): Promise<void> {
    const row: Record<string, unknown> = { updated_at: now() };
    if (updates.owedTo !== undefined) row.owed_to = updates.owedTo;
    if (updates.type !== undefined) row.type = updates.type;
    if (updates.approximateBalance !== undefined) row.approximate_balance = updates.approximateBalance;
    if (updates.notes !== undefined) row.notes = updates.notes || null;
    const { error } = await supabase.from('financial_debts').update(row).eq('id', id);
    if (error) throw error;
    const idx = this.debtCache.findIndex((d) => d.id === id);
    if (idx !== -1) this.debtCache[idx] = { ...this.debtCache[idx], ...updates };
  }

  static async deleteDebt(id: string): Promise<void> {
    const { error } = await supabase.from('financial_debts').delete().eq('id', id);
    if (error) throw error;
    this.debtCache = this.debtCache.filter((d) => d.id !== id);
  }

  static getTotalDebt(): number {
    return this.getDebts().reduce((sum, d) => sum + (d.approximateBalance || 0), 0);
  }

  // Misc
  static getMisc(): MiscFinancialEntry[] {
    return this.ensureLoaded() ? this.miscCache : [];
  }

  static async addMisc(entry: Omit<MiscFinancialEntry, 'id'>): Promise<MiscFinancialEntry> {
    const householdId = await getHouseholdId();
    const row = {
      household_id: householdId, key: entry.key, value: entry.value,
      notes: entry.notes || null,
    };
    const { data, error } = await supabase.from('financial_misc').insert(row).select().single();
    if (error) throw error;
    const newEntry: MiscFinancialEntry = {
      id: data.id, key: data.key, value: data.value, notes: data.notes || undefined,
    };
    this.miscCache.push(newEntry);
    return newEntry;
  }

  static async updateMisc(id: string, updates: Partial<MiscFinancialEntry>): Promise<void> {
    const row: Record<string, unknown> = { updated_at: now() };
    if (updates.key !== undefined) row.key = updates.key;
    if (updates.value !== undefined) row.value = updates.value;
    if (updates.notes !== undefined) row.notes = updates.notes || null;
    const { error } = await supabase.from('financial_misc').update(row).eq('id', id);
    if (error) throw error;
    const idx = this.miscCache.findIndex((m) => m.id === id);
    if (idx !== -1) this.miscCache[idx] = { ...this.miscCache[idx], ...updates };
  }

  static async deleteMisc(id: string): Promise<void> {
    const { error } = await supabase.from('financial_misc').delete().eq('id', id);
    if (error) throw error;
    this.miscCache = this.miscCache.filter((m) => m.id !== id);
  }

  static async clearAll(): Promise<void> {
    const householdId = await getHouseholdId();
    await Promise.all([
      supabase.from('financial_insurance').delete().eq('household_id', householdId),
      supabase.from('financial_superannuation').delete().eq('household_id', householdId),
      supabase.from('financial_income').delete().eq('household_id', householdId),
      supabase.from('financial_debts').delete().eq('household_id', householdId),
      supabase.from('financial_misc').delete().eq('household_id', householdId),
    ]);
    this.insuranceCache = [];
    this.superCache = [];
    this.incomeCache = [];
    this.debtCache = [];
    this.miscCache = [];
  }
}
