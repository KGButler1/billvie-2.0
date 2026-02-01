import { motion } from 'framer-motion';
import { Check, RotateCcw, Trash2, CreditCard, RefreshCw } from 'lucide-react';
import { Bill, PAYMENT_METHOD_LABELS } from '@/types/bill';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BillCardProps {
  bill: Bill;
  onMarkPaid: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
  onDelete: (id: string) => void;
}

const BillCard = ({ bill, onMarkPaid, onMarkUnpaid, onDelete }: BillCardProps) => {
  const isPaid = bill.status === 'paid';
  
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
      className={cn(
        'card-bill relative',
        isPaid && 'opacity-60'
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
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              'font-semibold text-foreground truncate',
              isPaid && 'line-through'
            )}>
              {bill.name}
            </h3>
            {bill.isRecurring && (
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          {/* Amount and due date */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
                {PAYMENT_METHOD_LABELS[bill.paymentMethod]}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={cn(
          'text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0',
          statusStyles[bill.status]
        )}>
          {statusLabels[bill.status]}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
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
            Mark as Paid
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(bill.id)}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default BillCard;
