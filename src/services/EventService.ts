import { Event, EventExpense, EventType, EventStatus } from '@/types/bill';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

function rowToEvent(row: Record<string, unknown>, expenses: EventExpense[]): Event {
  return {
    id: row.id as string,
    name: row.name as string,
    type: (row.type as EventType) || 'custom',
    budget: row.budget != null ? Number(row.budget) : undefined,
    startDate: (row.start_date as string) || undefined,
    endDate: (row.end_date as string) || undefined,
    status: (row.status as EventStatus) || 'planning',
    expenses,
    isSample: row.is_sample as boolean | undefined,
    deletedAt: (row.deleted_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function eventToRow(event: Partial<Event>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (event.name !== undefined) row.name = event.name;
  if (event.type !== undefined) row.type = event.type;
  if (event.budget !== undefined) row.budget = event.budget;
  if (event.startDate !== undefined) row.start_date = event.startDate || null;
  if (event.endDate !== undefined) row.end_date = event.endDate || null;
  if (event.status !== undefined) row.status = event.status;
  if (event.isSample !== undefined) row.is_sample = event.isSample;
  if (event.deletedAt !== undefined) row.deleted_at = event.deletedAt || null;
  return row;
}

function expenseRowToExpense(row: Record<string, unknown>): EventExpense {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    name: row.name as string,
    amount: Number(row.amount) || 0,
    category: (row.category as string) || 'General',
    isPaid: row.is_paid as boolean,
    paidDate: (row.paid_date as string) || undefined,
    createdAt: row.created_at as string,
  };
}

let cache: Event[] = [];
let loaded = false;

export class EventService {
  static isLoaded(): boolean {
    return loaded;
  }

  static async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const [eventsRes, expensesRes] = await Promise.all([
      supabase.from('events').select('*').eq('household_id', householdId).order('created_at', { ascending: false }),
      supabase.from('event_expenses').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
    ]);

    if (eventsRes.error) throw eventsRes.error;
    if (expensesRes.error) throw expensesRes.error;

    const expenses = (expensesRes.data || []).map(expenseRowToExpense);
    const expensesByEvent = new Map<string, EventExpense[]>();
    expenses.forEach((e) => {
      if (!expensesByEvent.has(e.eventId)) expensesByEvent.set(e.eventId, []);
      expensesByEvent.get(e.eventId)!.push(e);
    });

    cache = (eventsRes.data || []).map((row) => rowToEvent(row, expensesByEvent.get(row.id) || []));
    loaded = true;
  }

  private static ensureLoaded(): Event[] {
    return loaded ? cache : [];
  }

  static getAllEvents(): Event[] {
    return this.ensureLoaded().filter((e) => !e.deletedAt);
  }

  static getEventById(id: string): Event | undefined {
    return this.getAllEvents().find((event) => event.id === id);
  }

  static getActiveEvents(): Event[] {
    return this.getAllEvents().filter((e) => e.status === 'active' || e.status === 'planning');
  }

  static async createEvent(eventData: Omit<Event, 'id' | 'expenses' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const householdId = await getHouseholdId();
    const row = { ...eventToRow(eventData), household_id: householdId };

    const { data, error } = await supabase
      .from('events')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    const newEvent = rowToEvent(data, []);
    cache.push(newEvent);
    return newEvent;
  }

  static async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    // Don't write expenses to the events table — they're in event_expenses
    const { expenses: _expenses, ...rest } = updates;
    const row = { ...eventToRow(rest), updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('events')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updatedEvent = rowToEvent(data, this.getEventById(id)?.expenses || []);
    const index = cache.findIndex((e) => e.id === id);
    if (index !== -1) cache[index] = updatedEvent;
    return updatedEvent;
  }

  static async deleteEvent(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const index = cache.findIndex((e) => e.id === id);
    if (index !== -1) cache[index] = { ...cache[index], deletedAt: new Date().toISOString() };
    return true;
  }

  static getDeletedEvents(): Event[] {
    return this.ensureLoaded().filter((e) => !!e.deletedAt);
  }

  static async restoreEvent(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('events')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) throw error;
    const index = cache.findIndex((e) => e.id === id);
    if (index !== -1) cache[index] = { ...cache[index], deletedAt: undefined };
    return true;
  }

  static async permanentlyDeleteEvent(id: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    cache = cache.filter((e) => e.id !== id);
  }

  static async addExpense(eventId: string, expenseData: Omit<EventExpense, 'id' | 'eventId' | 'createdAt'>): Promise<EventExpense | undefined> {
    const householdId = await getHouseholdId();
    const row: Record<string, unknown> = {
      event_id: eventId,
      household_id: householdId,
      name: expenseData.name,
      amount: expenseData.amount,
      category: expenseData.category,
      is_paid: expenseData.isPaid,
      paid_date: expenseData.paidDate || null,
    };

    const { data, error } = await supabase
      .from('event_expenses')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    const newExpense = expenseRowToExpense(data);
    const event = this.getEventById(eventId);
    if (event) {
      event.expenses.push(newExpense);
    }
    return newExpense;
  }

  static async deleteExpense(eventId: string, expenseId: string): Promise<boolean> {
    const { error } = await supabase.from('event_expenses').delete().eq('id', expenseId);
    if (error) throw error;
    const event = this.getEventById(eventId);
    if (event) {
      event.expenses = event.expenses.filter((e) => e.id !== expenseId);
    }
    return true;
  }

  static getTotalSpent(event: Event): number {
    return event.expenses.reduce((sum, e) => sum + (e.isPaid ? e.amount : 0), 0);
  }

  static getTotalPlanned(event: Event): number {
    return event.expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  static async clearSampleEvents(): Promise<void> {
    const householdId = await getHouseholdId();
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('household_id', householdId)
      .eq('is_sample', true);
    if (error) throw error;
    cache = cache.filter((e) => !e.isSample);
  }

  static async clearAllEvents(): Promise<void> {
    const householdId = await getHouseholdId();
    const { error } = await supabase.from('events').delete().eq('household_id', householdId);
    if (error) throw error;
    cache = [];
  }

  static getEventCount(): number {
    return this.getAllEvents().filter((e) => !e.isSample).length;
  }
}
