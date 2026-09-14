import { PaymentCard } from '@/types/paymentCard';
import { LinkedItem } from '@/types/linkedItem';
import { BillService } from './BillService';
import { FinancialInfoService } from './FinancialInfoService';
import { EventService } from './EventService';
import { EventExpenseService } from './EventExpenseService';
import { formatCurrency } from '@/utils/currency';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

const now = () => new Date().toISOString();

function rowToCard(row: Record<string, unknown>): PaymentCard {
  return {
    id: row.id as string,
    nickname: row.nickname as string,
    expiryMonth: row.expiry_month as number | undefined,
    expiryYear: row.expiry_year as number | undefined,
    notes: (row.notes as string) || undefined,
    deletedAt: (row.deleted_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function cardToRow(card: Partial<PaymentCard>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (card.nickname !== undefined) row.nickname = card.nickname;
  if (card.expiryMonth !== undefined) row.expiry_month = card.expiryMonth;
  if (card.expiryYear !== undefined) row.expiry_year = card.expiryYear;
  if (card.notes !== undefined) row.notes = card.notes || null;
  if (card.deletedAt !== undefined) row.deleted_at = card.deletedAt || null;
  return row;
}

let cache: PaymentCard[] = [];
let loaded = false;

export const PaymentCardService = {
  isLoaded(): boolean {
    return loaded;
  },

  async refresh(): Promise<void> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('payment_cards')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    cache = (data || []).map(rowToCard);
    loaded = true;
  },

  getRaw(): PaymentCard[] {
    return loaded ? cache : [];
  },

  getAll(): PaymentCard[] {
    return this.getRaw().filter((c) => !c.deletedAt);
  },

  getDeleted(): PaymentCard[] {
    return this.getRaw().filter((c) => !!c.deletedAt);
  },

  getById(id?: string): PaymentCard | undefined {
    if (!id) return undefined;
    return this.getRaw().find((c) => c.id === id);
  },

  async add(data: Pick<PaymentCard, 'nickname'> & Partial<PaymentCard>): Promise<PaymentCard> {
    const householdId = await getHouseholdId();
    const row = {
      ...cardToRow(data),
      household_id: householdId,
    };

    const { data: result, error } = await supabase
      .from('payment_cards')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    const newCard = rowToCard(result);
    cache.push(newCard);
    return newCard;
  },

  async update(id: string, updates: Partial<PaymentCard>): Promise<PaymentCard | undefined> {
    const row = { ...cardToRow(updates), updated_at: now() };
    const { data, error } = await supabase
      .from('payment_cards')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updated = rowToCard(data);
    const index = cache.findIndex((c) => c.id === id);
    if (index !== -1) cache[index] = updated;
    return updated;
  },

  getLinkedItems(id: string): LinkedItem[] {
    const items: LinkedItem[] = [];
    BillService.getAllBills()
      .filter((b) => !b.deletedAt && b.paymentCardId === id)
      .forEach((b) =>
        items.push({
          id: b.id,
          kind: 'bill',
          title: b.name,
          detail: b.amount !== undefined ? formatCurrency(b.amount) : undefined,
          isAutoDebited: b.isAutoDebited,
          path: '/bills',
        })
      );
    FinancialInfoService.getDebts()
      .filter((d) => !d.deletedAt && d.linkedPaymentCardId === id)
      .forEach((d) =>
        items.push({
          id: d.id,
          kind: 'debt',
          title: d.owedTo,
          detail: d.approximateBalance !== undefined ? formatCurrency(d.approximateBalance) : undefined,
          path: '/financial',
        })
      );
    EventService.getAllEvents().forEach((event) => {
      if (event.deletedAt) return;
      EventExpenseService.getExpenses(event.id)
        .filter((e) => e.paymentCardId === id)
        .forEach((e) =>
          items.push({
            id: e.id,
            kind: 'event_expense',
            title: e.name,
            detail: e.amount !== undefined ? formatCurrency(e.amount) : undefined,
            path: `/events/${event.id}`,
          })
        );
    });
    return items;
  },

  countLinkedBills(id: string): number {
    return this.getLinkedItems(id).filter((i) => i.kind === 'bill').length;
  },

  countLinkedDebts(id: string): number {
    return this.getLinkedItems(id).filter((i) => i.kind === 'debt').length;
  },

  countLinkedEventExpenses(id: string): number {
    return this.getLinkedItems(id).filter((i) => i.kind === 'event_expense').length;
  },

  linkedSummary(id: string): string | undefined {
    const parts: string[] = [];
    const bills = this.countLinkedBills(id);
    const debts = this.countLinkedDebts(id);
    const eventExpenses = this.countLinkedEventExpenses(id);
    if (bills) parts.push(`${bills} ${bills === 1 ? 'bill' : 'bills'}`);
    if (debts) parts.push(`${debts} ${debts === 1 ? 'debt' : 'debts'}`);
    if (eventExpenses) parts.push(`${eventExpenses} event ${eventExpenses === 1 ? 'expense' : 'expenses'}`);
    if (!parts.length) return undefined;
    return `Linked to ${parts.join(', ')}. They'll keep showing this card until you restore it or delete it permanently.`;
  },

  async remove(id: string): Promise<void> {
    await this.update(id, { deletedAt: now() });
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from('payment_cards')
      .update({ deleted_at: null, updated_at: now() })
      .eq('id', id);
    if (error) throw error;
    const index = cache.findIndex((c) => c.id === id);
    if (index !== -1) cache[index] = { ...cache[index], deletedAt: undefined, updatedAt: now() };
  },

  async permanentlyRemove(id: string): Promise<void> {
    const { error } = await supabase.from('payment_cards').delete().eq('id', id);
    if (error) throw error;
    cache = cache.filter((c) => c.id !== id);
  },
};
