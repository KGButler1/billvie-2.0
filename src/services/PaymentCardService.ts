import { PaymentCard } from '@/types/paymentCard';
import { BillService } from './BillService';
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
    archivedAt: (row.archived_at as string) || undefined,
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
  if (card.archivedAt !== undefined) row.archived_at = card.archivedAt || null;
  return row;
}

let cache: PaymentCard[] = [];
let loaded = false;

export const PaymentCardService = {
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
    return this.getRaw().filter((c) => !c.archivedAt);
  },

  getArchived(): PaymentCard[] {
    return this.getRaw().filter((c) => !!c.archivedAt);
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

  countLinkedBills(id: string): number {
    return BillService.getAllBills().filter((b) => b.paymentCardId === id).length;
  },

  async archive(id: string): Promise<void> {
    await this.update(id, { archivedAt: now() });
  },

  async restore(id: string): Promise<void> {
    await this.update(id, { archivedAt: undefined });
  },

  async remove(id: string): Promise<'deleted' | 'archived'> {
    if (this.countLinkedBills(id) > 0) {
      await this.archive(id);
      return 'archived';
    }
    const { error } = await supabase.from('payment_cards').delete().eq('id', id);
    if (error) throw error;
    cache = cache.filter((c) => c.id !== id);
    return 'deleted';
  },
};
