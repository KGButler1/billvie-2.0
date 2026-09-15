import { supabase, getValidSession } from '@/lib/supabase';

const STORAGE_KEY = 'billvie:current_household_id';

export class NeedsHouseholdSelectionError extends Error {
  constructor() {
    super('NEEDS_HOUSEHOLD_SELECTION');
    this.name = 'NeedsHouseholdSelectionError';
  }
}

export interface HouseholdMembership {
  householdId: string;
  householdName: string;
  role: string;
  accessLevel: string | null;
  planStatus: string | null;
}

let cachedHouseholdId: string | null = null;
let cachedWindowDays: number | null = null;

export async function fetchMyHouseholds(): Promise<HouseholdMembership[]> {
  const { data, error } = await supabase.rpc('my_households');
  if (error) throw error;
  return (data || []).map((row: Record<string, unknown>) => ({
    householdId: row.household_id as string,
    householdName: row.household_name as string,
    role: row.role as string,
    accessLevel: (row.access_level as string) || null,
    planStatus: (row.plan_status as string) || null,
  }));
}

export async function getHouseholdId(): Promise<string> {
  if (cachedHouseholdId) return cachedHouseholdId;

  const session = await getValidSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const households = await fetchMyHouseholds();

  if (households.length === 0) throw new Error('No household found for user');

  const stored = localStorage.getItem(STORAGE_KEY);
  const match = stored ? households.find((h) => h.householdId === stored) : null;
  if (match) {
    cachedHouseholdId = match.householdId;
    return cachedHouseholdId;
  }

  if (households.length === 1) {
    cachedHouseholdId = households[0].householdId;
    localStorage.setItem(STORAGE_KEY, cachedHouseholdId);
    return cachedHouseholdId;
  }

  throw new NeedsHouseholdSelectionError();
}

export function setCurrentHousehold(householdId: string, redirectTo?: string): void {
  localStorage.setItem(STORAGE_KEY, householdId);
  clearHouseholdCache();
  if (redirectTo) {
    window.location.href = redirectTo;
  } else {
    window.location.reload();
  }
}

export function clearHouseholdCache(): void {
  cachedHouseholdId = null;
  cachedWindowDays = null;
}

export async function getComingUpWindowDays(): Promise<number> {
  if (cachedWindowDays !== null) return cachedWindowDays;
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('households')
    .select('bills_coming_up_window_days')
    .eq('id', householdId)
    .single();
  if (error) throw error;
  cachedWindowDays = (data?.bills_coming_up_window_days as number) ?? 14;
  return cachedWindowDays;
}

export function getCachedWindowDays(): number {
  return cachedWindowDays ?? 14;
}

export function setCachedWindowDays(days: number): void {
  cachedWindowDays = days;
}

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snake] = value;
  }
  return result;
}

export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camel] = value;
  }
  return result;
}
