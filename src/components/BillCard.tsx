import { motion } from 'framer-motion';
import { Check, RotateCcw, Trash2, CreditCard, RefreshCw, Zap, Pencil, AlertTriangle } from 'lucide-react';
import { Bill, PaymentMethod, PAYMENT_METHOD_LABELS, RECURRING_LABELS } from '@/types/bill';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CategoryBadge from './CategoryBadge';
import { PersonTagChips } from '@/components/people/PersonTags';
import { CustomBillOptionsService } from '@/services/CustomBillOptionsService';
import { PaymentCardService } from '@/services/PaymentCardService';
import { cardExpiryFlag, CARD_FLAG_LABELS } from '@/utils/cardExpiry';

interface BillCardProps {
  bill: Bill;
  onMarkPaid: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (bill: Bill) => void;
  onOpen?: (bill: Bill) => void;
}

// Helper to get payment method label (built-in or custom)
const getPaymentMethodLabel = (method: PaymentMethod | string): string => {
  if (method in PAYMENT_METHOD_LABELS) {
    return PAYMENT_METHOD_LABELS[method as PaymentMethod];
  }
  const customMethods = CustomBillOptionsService.getCustomPaymentMethods();
  const custom = customMethods.find(m => m.id === method);
  return custom?.label || method;
};


const BillCard = ({ bill, onMarkPaid, onMarkUnpaid, onDelete, onEdit, onOpen }: BillCardProps) => {
  const isPaid = bill.status === 'paid';
  const card = PaymentCardService.getById(bill.paymentCardId);
  const cardFlag = cardExpiryFlag(card);
  
  const statusStyles = {
    paid: 'status-paid',
    due_soon: 'status-due-soon',
    overdue: 'status-overdue',
    pending: 'status-pending',
  };

  const statusLabels = {
    paid: 'Paid',
    due_soon: 'Due Soon',
    overdue: 'Overdue',
    pending: 'Pending',
  };

  return (
    <motion.div
      layout
      onClick={() => onOpen?.(bill)}
      className={cn(
        'card-bill relative',
        isPaid && 'opacity-60',
        onOpen && 'cursor-pointer'
      )}
    >
      {/* Sample indicator */}
      {bill.isSample && (
        <span className="absolute top-2 right-2 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
          Sample
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Bill name and status */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className={cn(
              'font-semibold text-foreground truncate',
              isPaid && 'line-through'
            )}>
              {bill.name}
            </h3>
            {bill.isRecurring && (
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
            {bill.isAutoDebited && (
              <span title="Auto-debited">
                <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              </span>
            )}
          </div>

          {/* Category badge */}
          {bill.category && (
            <div className="mb-2">
              <CategoryBadge category={bill.category} />
            </div>
          )}

          <PersonTagChips personIds={bill.taggedPersonIds} className="mb-2" />

          {/* Amount and due date */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {bill.amount !== undefined && (
              <span className="font-medium text-foreground">
                ${bill.amount.toFixed(2)}
              </span>
            )}
            {bill.dueDate && (
              <span>
                {isPaid ? 'Paid' : 'Due'} {format(parseISO(bill.dueDate), 'MMM d')}
              </span>
            )}
            {bill.paymentMethod && (
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                {getPaymentMethodLabel(bill.paymentMethod)}
              </span>
            )}
            {card && (
              <span className="text-xs">{card.nickname}</span>
            )}
            {bill.isRecurring && bill.recurringInterval && (
              <span className="text-xs">
                {RECURRING_LABELS[bill.recurringInterval]}
              </span>
            )}
          </div>

          {bill.notes && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 whitespace-pre-line">
              {bill.notes}
            </p>
          )}

        </div>

        {/* Status + card badges */}
        <div className={cn('flex flex-col items-end gap-1.5 flex-shrink-0', bill.isSample && 'mt-5')}>
        <span className={cn(
          'text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0',
          statusStyles[bill.status]
        )}>
          {statusLabels[bill.status]}
        </span>
        {cardFlag && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full status-overdue inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {CARD_FLAG_LABELS[cardFlag]}
          </span>
        )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 mt-4 pt-3 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {isPaid ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkUnpaid(bill.id)}
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Mark Unpaid
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkPaid(bill.id)}
            className="flex-1 text-status-paid hover:bg-status-paid/10"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark as Handled
          </Button>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${bill.name}`}
            onClick={() => onEdit(bill)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${bill.name}`}
          onClick={() => onDelete(bill.id)}
          className="h-8 w-8 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
};

export default BillCard;
