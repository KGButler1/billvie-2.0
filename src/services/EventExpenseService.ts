import { Event, EventExpense } from '@/types/bill';
import {
  EventExpenseExtended,
  CategorySummary,
  EventStats,
  CATEGORY_ICONS,
  ExpenseUnit,
  EXPENSE_UNIT_SINGULAR
} from '@/types/event';
import { EventService } from './EventService';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';
import { differenceInDays, parseISO } from 'date-fns';
import { formatCurrency } from '@/utils/currency';

const now = () => new Date().toISOString();

export class EventExpenseService {
  // Get all expenses for an event (converted to extended format)
  static getExpenses(eventId: string): EventExpenseExtended[] {
    const event = EventService.getEventById(eventId);
    if (!event) return [];

    return event.expenses.map(expense => this.toExtendedExpense(expense));
  }

  // Convert basic expense to extended format. The basic EventExpense type
  // only carries the fields needed for totals; the extended fields come from
  // the DB row via the cache, so we cast through a wider record type.
  static toExtendedExpense(expense: EventExpense): EventExpenseExtended {
    const wide = expense as EventExpense & Partial<EventExpenseExtended>;
    return {
      ...expense,
      description: wide.description,
      vendor: wide.vendor,
      quantity: wide.quantity,
      date: wide.date,
      paymentMethod: wide.paymentMethod,
      isCancellable: wide.isCancellable || 'tbd',
      cancellationNotes: wide.cancellationNotes,
      notes: wide.notes,
      updatedAt: wide.updatedAt || expense.createdAt,
    };
  }

  // Add new expense
  static async addExpense(
    eventId: string,
    expenseData: Omit<EventExpenseExtended, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>
  ): Promise<EventExpenseExtended | undefined> {
    const householdId = await getHouseholdId();
    const row: Record<string, unknown> = {
      event_id: eventId,
      household_id: householdId,
      name: expenseData.name,
      description: expenseData.description || null,
      vendor: expenseData.vendor || null,
      amount: expenseData.amount,
      quantity_value: expenseData.quantity?.value ?? null,
      quantity_unit: expenseData.quantity?.unit ?? null,
      category: expenseData.category,
      date: expenseData.date || null,
      payment_method: expenseData.paymentMethod || null,
      is_paid: expenseData.isPaid,
      paid_date: expenseData.paidDate || null,
      is_cancellable: expenseData.isCancellable || 'tbd',
      cancellation_notes: expenseData.cancellationNotes || null,
      notes: expenseData.notes || null,
    };

    const { data, error } = await supabase
      .from('event_expenses')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    const newExpense: EventExpenseExtended = {
      ...expenseData,
      id: data.id,
      eventId,
      createdAt: data.created_at,
      updatedAt: data.created_at,
    };

    const event = EventService.getEventById(eventId);
    if (event) {
      event.expenses.push({
        id: newExpense.id,
        eventId,
        name: newExpense.name,
        amount: newExpense.amount,
        category: newExpense.category,
        isPaid: newExpense.isPaid,
        paidDate: newExpense.paidDate,
        createdAt: newExpense.createdAt,
      });
    }

    return newExpense;
  }

  // Update expense
  static async updateExpense(
    eventId: string,
    expenseId: string,
    updates: Partial<EventExpenseExtended>
  ): Promise<EventExpenseExtended | undefined> {
    const row: Record<string, unknown> = { updated_at: now() };
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.description !== undefined) row.description = updates.description || null;
    if (updates.vendor !== undefined) row.vendor = updates.vendor || null;
    if (updates.amount !== undefined) row.amount = updates.amount;
    if (updates.quantity !== undefined) {
      row.quantity_value = updates.quantity?.value ?? null;
      row.quantity_unit = updates.quantity?.unit ?? null;
    }
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.date !== undefined) row.date = updates.date || null;
    if (updates.paymentMethod !== undefined) row.payment_method = updates.paymentMethod || null;
    if (updates.isPaid !== undefined) row.is_paid = updates.isPaid;
    if (updates.paidDate !== undefined) row.paid_date = updates.paidDate || null;
    if (updates.isCancellable !== undefined) row.is_cancellable = updates.isCancellable;
    if (updates.cancellationNotes !== undefined) row.cancellation_notes = updates.cancellationNotes || null;
    if (updates.notes !== undefined) row.notes = updates.notes || null;

    const { data, error } = await supabase
      .from('event_expenses')
      .update(row)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;

    const event = EventService.getEventById(eventId);
    if (event) {
      const index = event.expenses.findIndex(e => e.id === expenseId);
      if (index !== -1) {
        event.expenses[index] = {
          id: data.id,
          eventId,
          name: data.name,
          amount: Number(data.amount),
          category: data.category,
          isPaid: data.is_paid,
          paidDate: data.paid_date || undefined,
          createdAt: data.created_at,
        };
      }
    }

    return this.toExtendedExpense({
      id: data.id,
      eventId,
      name: data.name,
      amount: Number(data.amount),
      category: data.category,
      isPaid: data.is_paid,
      paidDate: data.paid_date || undefined,
      createdAt: data.created_at,
    });
  }

  // Delete expense
  static async deleteExpense(eventId: string, expenseId: string): Promise<boolean> {
    return EventService.deleteExpense(eventId, expenseId);
  }

  // Mark expense as paid
  static async markAsPaid(eventId: string, expenseId: string): Promise<EventExpenseExtended | undefined> {
    return this.updateExpense(eventId, expenseId, {
      isPaid: true,
      paidDate: new Date().toISOString(),
    });
  }

  // Mark expense as unpaid
  static async markAsUnpaid(eventId: string, expenseId: string): Promise<EventExpenseExtended | undefined> {
    return this.updateExpense(eventId, expenseId, {
      isPaid: false,
      paidDate: undefined,
    });
  }

  // Mark all in category as paid
  static async markCategoryPaid(eventId: string, category: string): Promise<void> {
    const expenses = this.getExpenses(eventId);
    for (const e of expenses.filter(e => e.category === category && !e.isPaid)) {
      await this.markAsPaid(eventId, e.id);
    }
  }

  // Calculate per-unit cost
  static calculatePerUnitCost(amount: number, quantity?: { value: number; unit: ExpenseUnit }): number | undefined {
    if (!quantity || quantity.value <= 0) return undefined;
    return amount / quantity.value;
  }

  // Get category summaries for an event
  static getCategorySummaries(event: Event): CategorySummary[] {
    const expenses = this.getExpenses(event.id);
    const summaryMap = new Map<string, CategorySummary>();

    expenses.forEach(expense => {
      let summary = summaryMap.get(expense.category);

      if (!summary) {
        summary = {
          name: expense.category,
          icon: CATEGORY_ICONS[expense.category] || '📝',
          totalAmount: 0,
          itemCount: 0,
          paidCount: 0,
          cancellableCount: 0,
          nonRefundableCount: 0,
          tbdCount: 0,
          expenses: [],
        };
        summaryMap.set(expense.category, summary);
      }

      summary.totalAmount += expense.amount;
      summary.itemCount += 1;
      summary.expenses.push(expense);

      if (expense.isPaid) summary.paidCount += 1;

      if (expense.isCancellable === 'yes') summary.cancellableCount += 1;
      else if (expense.isCancellable === 'no') summary.nonRefundableCount += 1;
      else summary.tbdCount += 1;

      if (expense.quantity) {
        if (!summary.totalQuantity) {
          summary.totalQuantity = 0;
          summary.quantityUnit = expense.quantity.unit;
        }
        if (summary.quantityUnit === expense.quantity.unit) {
          summary.totalQuantity += expense.quantity.value;
        }
      }
    });

    return Array.from(summaryMap.values())
      .filter(s => s.itemCount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  // Get event statistics
  static getEventStats(event: Event): EventStats {
    const expenses = this.getExpenses(event.id);

    const totalPlanned = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = expenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
    const totalUnpaid = totalPlanned - totalPaid;

    const paidItemsCount = expenses.filter(e => e.isPaid).length;
    const unpaidItemsCount = expenses.filter(e => !e.isPaid).length;

    const cancellableCount = expenses.filter(e => e.isCancellable === 'yes').length;
    const nonRefundableCount = expenses.filter(e => e.isCancellable === 'no').length;
    const tbdCount = expenses.filter(e => e.isCancellable === 'tbd').length;

    let totalDuration: number | undefined;
    if (event.startDate && event.endDate) {
      totalDuration = differenceInDays(parseISO(event.endDate), parseISO(event.startDate)) + 1;
    }

    return {
      totalPlanned,
      totalPaid,
      totalUnpaid,
      paidItemsCount,
      unpaidItemsCount,
      totalItems: expenses.length,
      cancellableCount,
      nonRefundableCount,
      tbdCount,
      totalDuration,
    };
  }

  // Get spending data for pie chart
  static getSpendingByCategory(eventId: string): { name: string; value: number; color: string }[] {
    const event = EventService.getEventById(eventId);
    if (!event) return [];

    const summaries = this.getCategorySummaries(event);
    const colors = [
      'hsl(var(--primary))',
      'hsl(200, 70%, 50%)',
      'hsl(145, 60%, 42%)',
      'hsl(38, 90%, 50%)',
      'hsl(280, 60%, 55%)',
      'hsl(20, 70%, 50%)',
      'hsl(0, 60%, 50%)',
      'hsl(170, 60%, 45%)',
    ];

    return summaries.map((summary, index) => ({
      name: summary.name,
      value: summary.totalAmount,
      color: colors[index % colors.length],
    }));
  }

  // Format per-unit display
  static formatPerUnit(amount: number, quantity?: { value: number; unit: ExpenseUnit }): string | undefined {
    if (!quantity || quantity.value <= 0) return undefined;
    const perUnit = amount / quantity.value;
    const unitLabel = EXPENSE_UNIT_SINGULAR[quantity.unit];
    return `${formatCurrency(perUnit, { showCents: true })} per ${unitLabel}`;
  }
}
