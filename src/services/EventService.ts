import { Event, EventExpense, EventType, EventStatus } from '@/types/bill';

const STORAGE_KEY = 'billvie_events';
const SAMPLE_DATA_SHOWN_KEY = 'billvie_events_sample_shown';

const generateId = (): string => {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateExpenseId = (): string => {
  return `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Template category structures for different event types
// DEPRECATED: categories are now household-defined via
// CustomBillOptionsService.getEventCategories(). Kept only until a cleanup pass
// confirms no remaining callers.
const EVENT_TEMPLATES: Record<EventType, string[]> = {
  travel: ['Flights', 'Accommodation', 'Transportation', 'Food & Dining', 'Activities', 'Shopping', 'Other'],
  wedding: ['Venue', 'Catering', 'Photography', 'Attire', 'Flowers', 'Entertainment', 'Invitations', 'Other'],
  moving: ['Moving Company', 'Packing Supplies', 'Deposits', 'Utilities Setup', 'Furniture', 'Repairs', 'Other'],
  renovation: ['Materials', 'Labor', 'Permits', 'Design', 'Appliances', 'Fixtures', 'Other'],
  birthday: ['Venue', 'Food & Drinks', 'Decorations', 'Entertainment', 'Cake', 'Gifts', 'Other'],
  custom: ['General', 'Other'],
};

const getSampleEvents = (): Event[] => {
  const today = new Date();
  const twoWeeksFromNow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
  
  const hawaiiEventId = generateId();
  const birthdayEventId = generateId();
  
  return [
    {
      id: hawaiiEventId,
      name: 'Sample Family Trip to Hawaii',
      type: 'travel',
      budget: 5000,
      startDate: twoWeeksFromNow.toISOString(),
      endDate: new Date(twoWeeksFromNow.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      isSample: true,
      expenses: [
        { id: generateExpenseId(), eventId: hawaiiEventId, name: 'Round-trip flights', amount: 1200, category: 'Flights', isPaid: true, paidDate: new Date().toISOString(), createdAt: new Date().toISOString() },
        { id: generateExpenseId(), eventId: hawaiiEventId, name: 'Beach Resort (7 nights)', amount: 1800, category: 'Accommodation', isPaid: true, paidDate: new Date().toISOString(), createdAt: new Date().toISOString() },
        { id: generateExpenseId(), eventId: hawaiiEventId, name: 'Rental car', amount: 350, category: 'Transportation', isPaid: false, createdAt: new Date().toISOString() },
        { id: generateExpenseId(), eventId: hawaiiEventId, name: 'Snorkeling tour', amount: 200, category: 'Activities', isPaid: false, createdAt: new Date().toISOString() },
        { id: generateExpenseId(), eventId: hawaiiEventId, name: 'Luau dinner', amount: 150, category: 'Food & Dining', isPaid: false, createdAt: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: birthdayEventId,
      name: 'Sample Birthday Party',
      type: 'birthday',
      budget: 500,
      startDate: threeMonthsAgo.toISOString(),
      endDate: threeMonthsAgo.toISOString(),
      status: 'completed',
      isSample: true,
      expenses: [
        { id: generateExpenseId(), eventId: birthdayEventId, name: 'Party venue rental', amount: 150, category: 'Venue', isPaid: true, paidDate: threeMonthsAgo.toISOString(), createdAt: threeMonthsAgo.toISOString() },
        { id: generateExpenseId(), eventId: birthdayEventId, name: 'Cake', amount: 75, category: 'Cake', isPaid: true, paidDate: threeMonthsAgo.toISOString(), createdAt: threeMonthsAgo.toISOString() },
        { id: generateExpenseId(), eventId: birthdayEventId, name: 'Decorations', amount: 50, category: 'Decorations', isPaid: true, paidDate: threeMonthsAgo.toISOString(), createdAt: threeMonthsAgo.toISOString() },
      ],
      createdAt: threeMonthsAgo.toISOString(),
      updatedAt: threeMonthsAgo.toISOString(),
    },
  ];
};

export class EventService {
  static initialize(): void {
    const sampleShown = localStorage.getItem(SAMPLE_DATA_SHOWN_KEY);
    if (!sampleShown) {
      const existingEvents = this.getAllEvents();
      if (existingEvents.length === 0) {
        const sampleEvents = getSampleEvents();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleEvents));
        localStorage.setItem(SAMPLE_DATA_SHOWN_KEY, 'true');
      }
    }
  }

  // Raw getter — includes soft-deleted events. All read-modify-write cycles
  // must use this, never getAllEvents().
  private static getRawEvents(): Event[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const events: Event[] = JSON.parse(data);

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const kept = events.filter(e => !e.deletedAt || new Date(e.deletedAt).getTime() > cutoff);
    if (kept.length !== events.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    }
    return kept;
  }

  static getAllEvents(): Event[] {
    return this.getRawEvents().filter(e => !e.deletedAt);
  }

  static getEventById(id: string): Event | undefined {
    const events = this.getAllEvents();
    return events.find(event => event.id === id);
  }

  static getActiveEvents(): Event[] {
    return this.getAllEvents().filter(e => e.status === 'active' || e.status === 'planning');
  }

  /** @deprecated Unused — event categories are household-defined now. */
  static getTemplateCategories(type: EventType): string[] {
    return EVENT_TEMPLATES[type] || EVENT_TEMPLATES.custom;
  }

  static createEvent(eventData: Omit<Event, 'id' | 'expenses' | 'createdAt' | 'updatedAt'>): Event {
    const now = new Date().toISOString();
    const newEvent: Event = {
      ...eventData,
      id: generateId(),
      expenses: [],
      createdAt: now,
      updatedAt: now,
    };
    
    const events = this.getRawEvents();
    events.push(newEvent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    
    return newEvent;
  }

  static updateEvent(id: string, updates: Partial<Event>): Event | undefined {
    const events = this.getRawEvents();
    const index = events.findIndex(event => event.id === id);
    
    if (index === -1) return undefined;
    
    const updatedEvent: Event = {
      ...events[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    events[index] = updatedEvent;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    
    return updatedEvent;
  }

  // Soft-delete (recoverable for 30 days)
  static deleteEvent(id: string): boolean {
    const events = this.getRawEvents();
    const index = events.findIndex(event => event.id === id);

    if (index === -1) return false;

    events[index] = { ...events[index], deletedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  }

  static getDeletedEvents(): Event[] {
    return this.getRawEvents().filter(e => !!e.deletedAt);
  }

  static restoreEvent(id: string): boolean {
    const events = this.getRawEvents();
    const index = events.findIndex(event => event.id === id);

    if (index === -1) return false;

    events[index] = { ...events[index], deletedAt: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  }

  static permanentlyDeleteEvent(id: string): void {
    const events = this.getRawEvents().filter(event => event.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  static addExpense(eventId: string, expenseData: Omit<EventExpense, 'id' | 'eventId' | 'createdAt'>): EventExpense | undefined {
    const event = this.getEventById(eventId);
    if (!event) return undefined;
    
    const newExpense: EventExpense = {
      ...expenseData,
      id: generateExpenseId(),
      eventId,
      createdAt: new Date().toISOString(),
    };
    
    event.expenses.push(newExpense);
    this.updateEvent(eventId, { expenses: event.expenses });
    
    return newExpense;
  }

  static deleteExpense(eventId: string, expenseId: string): boolean {
    const event = this.getEventById(eventId);
    if (!event) return false;
    
    const filteredExpenses = event.expenses.filter(e => e.id !== expenseId);
    if (filteredExpenses.length === event.expenses.length) return false;
    
    this.updateEvent(eventId, { expenses: filteredExpenses });
    return true;
  }

  static getTotalSpent(event: Event): number {
    return event.expenses.reduce((sum, e) => sum + (e.isPaid ? e.amount : 0), 0);
  }

  static getTotalPlanned(event: Event): number {
    return event.expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  static clearSampleEvents(): void {
    const events = this.getRawEvents().filter(event => !event.isSample);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  static clearAllEvents(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SAMPLE_DATA_SHOWN_KEY);
  }

  static getEventCount(): number {
    return this.getAllEvents().filter(e => !e.isSample).length;
  }

  static injectTestEvents(count: number = 2): void {
    const testEvents: Event[] = [];
    const types: EventType[] = ['travel', 'wedding', 'moving', 'renovation', 'birthday'];
    
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const eventId = generateId();
      testEvents.push({
        id: eventId,
        name: `Test ${EVENT_TEMPLATES[type] ? type.charAt(0).toUpperCase() + type.slice(1) : 'Event'} ${i + 1}`,
        type,
        budget: Math.floor(Math.random() * 5000) + 500,
        status: 'planning',
        expenses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    const existingEvents = this.getRawEvents();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existingEvents, ...testEvents]));
  }
}
