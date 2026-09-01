import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, CreditCard, Pencil, Archive, ArchiveRestore, TriangleAlert as AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PaymentCard, formatCardExpiry } from '@/types/paymentCard';
import { PaymentCardService } from '@/services/PaymentCardService';
import { cardExpiryFlag, CARD_FLAG_LABELS } from '@/utils/cardExpiry';
import FieldError from '@/components/ui/field-error';

interface ManageCardsSheetProps {
  onClose: () => void;
}

interface Draft {
  id?: string;
  nickname: string;
  month: string;
  year: string;
  notes: string;
}

const emptyDraft: Draft = { nickname: '', month: '', year: '', notes: '' };

const ManageCardsSheet = ({ onClose }: ManageCardsSheetProps) => {
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [archived, setArchived] = useState<PaymentCard[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [nicknameError, setNicknameError] = useState('');

  const refresh = () => {
    setCards(PaymentCardService.getAll());
    setArchived(PaymentCardService.getArchived());
  };

  useEffect(() => {
    PaymentCardService.refresh().then(refresh).catch(console.error);
  }, []);

  const startEdit = (card: PaymentCard) =>
    setDraft({
      id: card.id,
      nickname: card.nickname,
      month: card.expiryMonth ? String(card.expiryMonth) : '',
      year: card.expiryYear ? String(card.expiryYear) : '',
      notes: card.notes ?? '',
    });

  const save = async () => {
    if (!draft?.nickname.trim()) { setNicknameError('Give this card a nickname.'); return; }
    const m = draft.month ? parseInt(draft.month, 10) : undefined;
    const y = draft.year ? parseInt(draft.year, 10) : undefined;
    const payload = {
      nickname: draft.nickname.trim(),
      expiryMonth: m && m >= 1 && m <= 12 ? m : undefined,
      expiryYear: y && y > 1900 ? y : undefined,
      notes: draft.notes.trim() || undefined,
    };
    if (draft.id) await PaymentCardService.update(draft.id, payload);
    else await PaymentCardService.add(payload);
    setDraft(null);
    refresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-dramatic p-6 pb-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Payment Cards</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Nickname and expiry only — no card number, no CVV. Update a card once and every bill on it
          stays right.
        </p>

        {draft ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mc-nickname">What do you call it? <span className="text-[hsl(var(--destructive))]">*</span></Label>
              <Input
                id="mc-nickname"
                placeholder="e.g., Amex Gold"
                value={draft.nickname}
                onChange={(e) => { setDraft({ ...draft, nickname: e.target.value }); setNicknameError(''); }}
                className={nicknameError ? 'border-destructive' : undefined}
                autoFocus
              />
              <FieldError message={nicknameError} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mc-month">Expiry month</Label>
                <Input
                  id="mc-month"
                  type="number"
                  min={1}
                  max={12}
                  placeholder="MM"
                  value={draft.month}
                  onChange={(e) => setDraft({ ...draft, month: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-year">Expiry year</Label>
                <Input
                  id="mc-year"
                  type="number"
                  min={2000}
                  max={2100}
                  placeholder="YYYY"
                  value={draft.year}
                  onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-notes">Notes</Label>
              <Textarea
                id="mc-notes"
                rows={2}
                placeholder="Anything someone else would need to know"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>
                {draft.id ? 'Save changes' : 'Add card'}
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {cards.map((card) => {
                const flag = cardExpiryFlag(card);
                const linked = PaymentCardService.countLinkedBills(card.id);
                return (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{card.nickname}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCardExpiry(card) ?? 'No expiry recorded'}
                        {' · '}
                        {linked} {linked === 1 ? 'bill' : 'bills'}
                      </p>
                    </div>
                    {flag && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full status-overdue flex-shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        {CARD_FLAG_LABELS[flag]}
                      </span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => startEdit(card)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={async () => {
                        await PaymentCardService.remove(card.id);
                        refresh();
                      }}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}

              {!cards.length && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No cards recorded yet.
                </p>
              )}
            </div>

            {!!archived.length && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Archived</h3>
                <div className="space-y-2">
                  {archived.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border opacity-70"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{card.nickname}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCardExpiry(card) ?? 'No expiry recorded'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await PaymentCardService.restore(card.id);
                          refresh();
                        }}
                      >
                        <ArchiveRestore className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full mt-6" onClick={() => setDraft({ ...emptyDraft })}>
              Add a card
            </Button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ManageCardsSheet;
