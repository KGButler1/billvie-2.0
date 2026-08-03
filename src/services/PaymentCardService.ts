import { PaymentCard } from '@/types/paymentCard';
import { BillService } from './BillService';

const CARDS_KEY = 'billvie_payment_cards';

const now = () => new Date().toISOString();

const generateId = (): string => `card_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const read = (): PaymentCard[] => {
  const data = localStorage.getItem(CARDS_KEY);
  return data ? JSON.parse(data) : [];
};

const write = (cards: PaymentCard[]) => {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
};

export const PaymentCardService = {
  // Raw getter — includes archived cards. Every read-modify-write MUST use this.
  getRaw(): PaymentCard[] {
    return read();
  },

  getAll(): PaymentCard[] {
    return read().filter((c) => !c.archivedAt);
  },

  getArchived(): PaymentCard[] {
    return read().filter((c) => !!c.archivedAt);
  },

  getById(id?: string): PaymentCard | undefined {
    if (!id) return undefined;
    return read().find((c) => c.id === id);
  },

  add(data: Pick<PaymentCard, 'nickname'> & Partial<PaymentCard>): PaymentCard {
    const cards = read();
    const card: PaymentCard = {
      id: generateId(),
      nickname: data.nickname.trim(),
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      notes: data.notes,
      createdAt: now(),
      updatedAt: now(),
    };
    cards.push(card);
    write(cards);
    return card;
  },

  update(id: string, updates: Partial<PaymentCard>): PaymentCard | undefined {
    const cards = read();
    const index = cards.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    cards[index] = { ...cards[index], ...updates, id, updatedAt: now() };
    write(cards);
    return cards[index];
  },

  // How many bills point at this card — drives the "fix once, fixes everything" copy.
  countLinkedBills(id: string): number {
    return BillService.getAllBills().filter((b) => b.paymentCardId === id).length;
  },

  archive(id: string): void {
    this.update(id, { archivedAt: now() });
  },

  restore(id: string): void {
    this.update(id, { archivedAt: undefined });
  },

  // Only ever a real delete when nothing references it — same instinct as elsewhere.
  remove(id: string): 'deleted' | 'archived' {
    if (this.countLinkedBills(id) > 0) {
      this.archive(id);
      return 'archived';
    }
    write(read().filter((c) => c.id !== id));
    return 'deleted';
  },
};
