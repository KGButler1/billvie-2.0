import { useEffect, useState } from 'react';
import { Plus, X, Check, TriangleAlert as AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentCard, formatCardExpiry } from '@/types/paymentCard';
import { PaymentCardService } from '@/services/PaymentCardService';
import { cardExpiryFlag, CARD_FLAG_LABELS } from '@/utils/cardExpiry';
import { cn } from '@/lib/utils';

interface CardPickerProps {
  value?: string;
  onChange: (cardId: string | undefined) => void;
}

// Mirrors PersonTagPicker: selectable chips plus an inline add row.
const CardPicker = ({ value, onChange }: CardPickerProps) => {
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [nickname, setNickname] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    PaymentCardService.refresh().then(() => setCards(PaymentCardService.getAll())).catch(console.error);
  }, []);

  const reset = () => {
    setNickname('');
    setMonth('');
    setYear('');
    setIsAdding(false);
  };

  const handleAdd = async () => {
    if (!nickname.trim()) return;
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    const card = await PaymentCardService.add({
      nickname: nickname.trim(),
      expiryMonth: m && m >= 1 && m <= 12 ? m : undefined,
      expiryYear: y && y > 1900 ? y : undefined,
    });
    setCards(PaymentCardService.getAll());
    onChange(card.id);
    reset();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {cards.map((card) => {
          const selected = card.id === value;
          const flag = cardExpiryFlag(card);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onChange(selected ? undefined : card.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors',
                selected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              )}
            >
              {selected && <Check className="w-3 h-3" />}
              {card.nickname}
              {formatCardExpiry(card) && (
                <span className={selected ? 'opacity-80' : 'text-muted-foreground'}>
                  {formatCardExpiry(card)}
                </span>
              )}
              {flag && !selected && (
                <span className="inline-flex items-center gap-0.5 text-status-overdue">
                  <AlertTriangle className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add a card
          </button>
        )}
      </div>

      {isAdding && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="card-nickname" className="text-xs">
              What do you call it?
            </Label>
            <Input
              id="card-nickname"
              placeholder="e.g., Amex Gold, the joint Visa"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                } else if (e.key === 'Escape') {
                  reset();
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="card-month" className="text-xs">
                Expiry month
              </Label>
              <Input
                id="card-month"
                type="number"
                min={1}
                max={12}
                placeholder="MM"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card-year" className="text-xs">
                Expiry year
              </Label>
              <Input
                id="card-year"
                type="number"
                min={2000}
                max={2100}
                placeholder="YYYY"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Just enough to help someone else keep this running — no card number, no CVV.
          </p>

          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAdd} disabled={!nickname.trim()}>
              Save card
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!!cards.length && !isAdding && (
        <p className="text-xs text-muted-foreground">
          Fixing a card's expiry here updates every bill on it.
        </p>
      )}
    </div>
  );
};

export default CardPicker;
export { CARD_FLAG_LABELS };
