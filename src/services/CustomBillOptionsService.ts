import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

export type CustomOptionType = 'bill_category' | 'payment_method' | 'event_category' | 'business_name';

export interface CustomOption {
  id: string;
  label: string;
}

let cache: Record<CustomOptionType, CustomOption[]> = {
  bill_category: [],
  payment_method: [],
  event_category: [],
  business_name: [],
};
let loaded = false;

export class CustomBillOptionsService {
  static async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('custom_options')
      .select('*')
      .eq('household_id', householdId)
      .order('label', { ascending: true });

    if (error) throw error;

    cache = {
      bill_category: [],
      payment_method: [],
      event_category: [],
      business_name: [],
    };
    (data || []).forEach((row) => {
      const opt: CustomOption = { id: row.id, label: row.label };
      const type = row.option_type as CustomOptionType;
      if (cache[type]) cache[type].push(opt);
    });
    loaded = true;
  }

  private static ensureLoaded(type: CustomOptionType): CustomOption[] {
    return loaded ? cache[type] : [];
  }

  static getCustomCategories(): CustomOption[] {
    return this.ensureLoaded('bill_category');
  }

  static async addCustomCategory(label: string): Promise<CustomOption> {
    return this.addOption('bill_category', label);
  }

  static async deleteCustomCategory(id: string): Promise<void> {
    return this.deleteOption(id);
  }

  static getCustomPaymentMethods(): CustomOption[] {
    return this.ensureLoaded('payment_method');
  }

  static async addCustomPaymentMethod(label: string): Promise<CustomOption> {
    return this.addOption('payment_method', label);
  }

  static async deleteCustomPaymentMethod(id: string): Promise<void> {
    return this.deleteOption(id);
  }

  static getEventCategories(): CustomOption[] {
    return this.ensureLoaded('event_category');
  }

  static async addEventCategory(label: string): Promise<CustomOption> {
    const trimmed = label.trim();
    const existing = this.getEventCategories().find((c) => c.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    return this.addOption('event_category', trimmed);
  }

  static async deleteEventCategory(id: string): Promise<void> {
    return this.deleteOption(id);
  }

  static getCustomBusinessNames(): CustomOption[] {
    return this.ensureLoaded('business_name');
  }

  static async addCustomBusinessName(label: string): Promise<CustomOption> {
    const trimmed = label.trim();
    const existing = this.getCustomBusinessNames().find((n) => n.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    return this.addOption('business_name', trimmed);
  }

  static async deleteCustomBusinessName(id: string): Promise<void> {
    return this.deleteOption(id);
  }

  private static async addOption(type: CustomOptionType, label: string): Promise<CustomOption> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('custom_options')
      .insert({ household_id: householdId, option_type: type, label: label.trim() })
      .select()
      .single();

    if (error) throw error;
    const opt: CustomOption = { id: data.id, label: data.label };
    cache[type].push(opt);
    return opt;
  }

  private static async deleteOption(id: string): Promise<void> {
    const { error } = await supabase.from('custom_options').delete().eq('id', id);
    if (error) throw error;
    (Object.keys(cache) as CustomOptionType[]).forEach((type) => {
      cache[type] = cache[type].filter((o) => o.id !== id);
    });
  }
}
