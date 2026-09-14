import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, CreditCard, Pencil, Trash2, TriangleAlert as AlertTriangle, ArrowLeft, ArrowRightLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PaymentCard, formatCardExpiry } from '@/types/paymentCard';
import { PaymentCardService } from '@/services/PaymentCardService';
import { BillService } from '@/services/BillService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { UserService } from '@/services/UserService';
import { cardExpiryFlag, CARD_FLAG_LABELS } from '@/utils/cardExpiry';
import { LinkedItem } from '@/types/linkedItem';
import FieldError from '@/components/ui/field-error';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import AdminOnly from '@/components/AdminOnly';
import EditOnly from '@/components/EditOnly';
import CardPicker from '@/components/bills/CardPicker';
import { toast } from 'sonner';

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

const KIND_LABELS: Record<LinkedItem['kind'], string> = {
  bill: 'Bills',
  debt: 'Debts',
  income: 'Income',
  superannuation: 'Savings & retirement',
};

const ManageCardsSheet = ({ onClose }: ManageCardsSheetProps) => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<string | undefined>(undefined);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const refresh = () => {
    setCards(PaymentCardService.getAll());
  };

  useEffect(() => {
    PaymentCardService.refresh().then(refresh).catch(console.error);
  }, []);

  const detailCard = detailId ? PaymentCardService.getById(detailId) : null;
  const linkedItems = detailId ? PaymentCardService.getLinkedItems(detailId) : [];

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

  const handleDelete = (card: PaymentCard) => {
    const warnKey = 'paymentCard';
    if (!UserService.shouldWarnBeforeDelete(warnKey)) {
      void PaymentCardService.remove(card.id).then(refresh);
      return;
    }
    setPendingDelete({ id: card.id, name: card.nickname });
  };

  const confirmDelete = async () => {
    if (pendingDelete) {
      await PaymentCardService.remove(pendingDelete.id);
      refresh();
    }
    setPendingDelete(null);
  };

  const handleNavigateToItem = (item: LinkedItem) => {
    onClose();
    if (item.kind === 'bill') {
      navigate(`/bills?paidFrom=card:${item.id}`);
    } else {
      navigate(item.path);
    }
  };

  const startBulkMove = () => {
    setBulkSelected(new Set(linkedItems.map((i) => i.id)));
    setBulkTarget(undefined);
    setShowBulkMove(true);
  };

  const toggleBulkItem = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBulkMove = async () => {
    if (!detailId || !bulkTarget || bulkTarget === detailId) return;
    setBulkLoading(true);
    const items = linkedItems.filter((i) => bulkSelected.has(i.id));
    let success = 0;
    let failures = 0;
    for (const item of items) {
      try {
        if (item.kind === 'bill') {
          await BillService.updateBill(item.id, { paymentCardId: bulkTarget });
        } else if (item.kind === 'debt') {
          await FinancialInfoService.updateDebt(item.id, { linkedPaymentCardId: bulkTarget });
        }
        success++;
      } catch {
        failures++;
      }
    }
    await Promise.all([BillService.refresh(), FinancialInfoService.refresh()]);
    setBulkLoading(false);
    setShowBulkMove(false);
    refresh();
    if (failures === 0) {
      toast.success(`Moved ${success} ${success === 1 ? 'item' : 'items'} to ${PaymentCardService.getById(bulkTarget)?.nickname ?? 'the new card'}.`);
    } else {
      toast.error(`Moved ${success} of ${success + failures}. ${failures} couldn't be updated — try again.`);
    }
  };

  const renderDetail = () => {
    if (!detailCard) return null;
    const flag = cardExpiryFlag(detailCard);
    const grouped = linkedItems.reduce<Record<string, LinkedItem[]>>((acc, item) => {
      (acc[item.kind] ??= []).push(item);
      return acc;
    }, {});

    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setDetailId(null)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back to cards">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">{detailCard.nickname}</h2>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">
              {formatCardExpiry(detailCard) ?? 'No expiry recorded'}
            </p>
            {flag && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full status-overdue mt-1">
                <AlertTriangle className="w-3 h-3" />
                {CARD_FLAG_LABELS[flag]}
              </span>
            )}
          </div>
        </div>

        {detailCard.notes && (
          <p className="text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-muted/50">{detailCard.notes}</p>
        )}

        {linkedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nothing is paid from this yet.</p>
        ) : (
          <>
            {Object.entries(grouped).map(([kind, items]) => (
              <div key={kind} className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{KIND_LABELS[kind as LinkedItem['kind']]}</h3>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigateToItem(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                      </div>
                      {item.isAutoDebited && (
                        <span className="text-xs text-muted-foreground italic flex-shrink-0">pays itself</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <AdminOnly>
            <EditOnly>
              <Button variant="outline" className="w-full mt-4" onClick={startBulkMove}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Move everything to another card
              </Button>
            </EditOnly>
            </AdminOnly>
          </>
        )}

        <AdminOnly>
        <EditOnly>
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => { startEdit(detailCard); setDetailId(null); }}>
            <Pencil className="w-4 h-4 mr-1.5" /> Edit
          </Button>
          <Button variant="ghost" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDelete(detailCard)}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
        </div>
        </EditOnly>
        </AdminOnly>
      </>
    );
  };

  const renderBulkMove = () => {
    const selectedCount = bulkSelected.size;
    const targetCard = bulkTarget ? PaymentCardService.getById(bulkTarget) : null;
    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setShowBulkMove(false)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">Move to another card</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Move to</Label>
            <CardPicker value={bulkTarget} onChange={setBulkTarget} excludeId={detailId ?? undefined} />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {linkedItems.map((item) => (
                <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={bulkSelected.has(item.id)}
                    onChange={() => toggleBulkItem(item.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{KIND_LABELS[item.kind]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
            {selectedCount > 0 && targetCard
              ? `Move ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} from ${detailCard?.nickname ?? 'this card'} to ${targetCard.nickname}?`
              : 'Choose a destination card and at least one item.'}
          </div>

          <Button
            className="w-full"
            disabled={!bulkTarget || bulkTarget === detailId || selectedCount === 0 || bulkLoading}
            onClick={confirmBulkMove}
          >
            {bulkLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Moving…</> : <><Check className="w-4 h-4 mr-2" /> Confirm move</>}
          </Button>
        </div>
      </>
    );
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
        role="dialog"
        aria-labelledby="mc-title"
      >
        {showBulkMove && detailCard ? (
          renderBulkMove()
        ) : detailId && detailCard ? (
          renderDetail()
        ) : draft ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <h2 id="mc-title" className="text-xl font-semibold">{draft.id ? 'Edit card' : 'Add a card'}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
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
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h2 id="mc-title" className="text-xl font-semibold">Payment Cards</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Nickname and expiry only — no card number, no CVV. Update a card once and every bill on it
              stays right.
            </p>

            <div className="space-y-2">
              {cards.map((card) => {
                const flag = cardExpiryFlag(card);
                const summary = PaymentCardService.linkedSummary(card.id);
                return (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <button
                      onClick={() => setDetailId(card.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-medium truncate">{card.nickname}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCardExpiry(card) ?? 'No expiry recorded'}
                        {summary ? ` · ${summary}` : ''}
                      </p>
                    </button>
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
                      onClick={() => handleDelete(card)}
                    >
                      <Trash2 className="w-4 h-4" />
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

            <Button className="w-full mt-6" onClick={() => setDraft({ ...emptyDraft })}>
              Add a card
            </Button>
          </>
        )}
      </motion.div>

      <ConfirmDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        warnKey="paymentCard"
        title={`Delete ${pendingDelete?.name ?? 'this card'}?`}
        linkedSummary={pendingDelete ? PaymentCardService.linkedSummary(pendingDelete.id) : undefined}
        onConfirm={confirmDelete}
      />
    </motion.div>
  );
};

export default ManageCardsSheet;
