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
import { differenceInDays, parseISO } from 'date-fns';

const generateExpenseId = (): string => {
  return `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export class EventExpenseService {
  // Get all expenses for an event (converted to extended format)
  static getExpenses(eventId: string): EventExpenseExtended[] {
    const event = EventService.getEventById(eventId);
    if (!event) return [];
    
    return event.expenses.map(expense => this.toExtendedExpense(expense));
  }

  // Convert basic expense to extended format
  static toExtendedExpense(expense: EventExpense): EventExpenseExtended {
    return {
      ...expense,
      description: (expense as any).description,
      vendor: (expense as any).vendor,
      quantity: (expense as any).quantity,
      date: (expense as any).date,
      paymentMethod: (expense as any).paymentMethod,
      isCancellable: (expense as any).isCancellable || 'tbd',
      cancellationNotes: (expense as any).cancellationNotes,
      notes: (expense as any).notes,
      updatedAt: (expense as any).updatedAt || expense.createdAt,
    };
  }

  // Add new expense
  static addExpense(
    eventId: string, 
    expenseData: Omit<EventExpenseExtended, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>
  ): EventExpenseExtended | undefined {
    const event = EventService.getEventById(eventId);
    if (!event) return undefined;

    const now = new Date().toISOString();
    const newExpense: EventExpenseExtended = {
      ...expenseData,
      id: generateExpenseId(),
      eventId,
      createdAt: now,
      updatedAt: now,
    };

    // Store as basic expense for compatibility
    const basicExpense: EventExpense = {
      id: newExpense.id,
      eventId: newExpense.eventId,
      name: newExpense.name,
      amount: newExpense.amount,
      category: newExpense.category,
      isPaid: newExpense.isPaid,
      paidDate: newExpense.paidDate,
      createdAt: newExpense.createdAt,
      // Store extended fields
      ...(newExpense as any),
    };

    event.expenses.push(basicExpense);
    EventService.updateEvent(eventId, { expenses: event.expenses });

    return newExpense;
  }

  // Update expense
  static updateExpense(
    eventId: string,
    expenseId: string,
    updates: Partial<EventExpenseExtended>
  ): EventExpenseExtended | undefined {
    const event = EventService.getEventById(eventId);
    if (!event) return undefined;

    const index = event.expenses.findIndex(e => e.id === expenseId);
    if (index === -1) return undefined;

    const updatedExpense = {
      ...event.expenses[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    event.expenses[index] = updatedExpense as EventExpense;
    EventService.updateEvent(eventId, { expenses: event.expenses });

    return this.toExtendedExpense(updatedExpense as EventExpense);
  }

  // Delete expense
  static deleteExpense(eventId: string, expenseId: string): boolean {
    return EventService.deleteExpense(eventId, expenseId);
  }

  // Mark expense as paid
  static markAsPaid(eventId: string, expenseId: string): EventExpenseExtended | undefined {
    return this.updateExpense(eventId, expenseId, {
      isPaid: true,
      paidDate: new Date().toISOString(),
    });
  }

  // Mark expense as unpaid
  static markAsUnpaid(eventId: string, expenseId: string): EventExpenseExtended | undefined {
    return this.updateExpense(eventId, expenseId, {
      isPaid: false,
      paidDate: undefined,
    });
  }

  // Mark all in category as paid
  static markCategoryPaid(eventId: string, category: string): void {
    const expenses = this.getExpenses(eventId);
    expenses
      .filter(e => e.category === category && !e.isPaid)
      .forEach(e => this.markAsPaid(eventId, e.id));
  }

  // Calculate per-unit cost
  static calculatePerUnitCost(amount: number, quantity?: { value: number; unit: ExpenseUnit }): number | undefined {
    if (!quantity || quantity.value <= 0) return undefined;
    return amount / quantity.value;
  }

  // Get category summaries for an event
  static getCategorySummaries(event: Event): CategorySummary[] {
    const expenses = this.getExpenses(event.id);
    const categories = EventService.getTemplateCategories(event.type);
    
    const summaryMap = new Map<string, CategorySummary>();

    // Initialize all categories from template
    categories.forEach(cat => {
      summaryMap.set(cat, {
        name: cat,
        icon: CATEGORY_ICONS[cat] || '📝',
        totalAmount: 0,
        itemCount: 0,
        paidCount: 0,
        cancellableCount: 0,
        nonRefundableCount: 0,
        tbdCount: 0,
        expenses: [],
      });
    });

    // Populate with expenses
    expenses.forEach(expense => {
      let summary = summaryMap.get(expense.category);
      
      // Create category if not in template
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

      // Track quantities for per-unit calculations
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

    // Return only categories with expenses, sorted by amount
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

    // Calculate duration if dates exist
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
    return `$${perUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per ${unitLabel}`;
  }
}
