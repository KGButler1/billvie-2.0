import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { EventExpenseExtended, EXPENSE_UNIT_LABELS } from '@/types/event';
import { EventExpenseService } from '@/services/EventExpenseService';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface ExpenseItemProps {
  expense: EventExpenseExtended;
  eventId: string;
  onUpdate: () => void;
  onEdit: () => void;
}

const ExpenseItem = ({ expense, eventId, onUpdate, onEdit }: ExpenseItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTogglePaid = () => {
    if (expense.isPaid) {
      EventExpenseService.markAsUnpaid(eventId, expense.id);
    } else {
      EventExpenseService.markAsPaid(eventId, expense.id);
    }
    onUpdate();
  };

  const handleDelete = () => {
    if (confirm('Delete this expense?')) {
      EventExpenseService.deleteExpense(eventId, expense.id);
      onUpdate();
    }
  };

  const perUnitDisplay = EventExpenseService.formatPerUnit(expense.amount, expense.quantity);

  const cancellableIcon = {
    yes: <Check className="w-3 h-3 text-green-500" />,
    no: <X className="w-3 h-3 text-destructive" />,
    tbd: <span className="text-xs text-muted-foreground">TBD</span>,
  };

  return (
    <div className="bg-background">
      {/* Main Row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Paid Status Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePaid();
          }}
          className={cn(
            'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
            expense.isPaid
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-muted-foreground hover:border-primary'
          )}
        >
          {expense.isPaid && <Check className="w-4 h-4" />}
        </button>

        {/* Description & Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-medium truncate',
              expense.isPaid && 'line-through text-muted-foreground'
            )}>
              {expense.name}
            </span>
            {expense.vendor && (
              <span className="text-sm text-muted-foreground truncate">
                - {expense.vendor}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {expense.quantity && (
              <span>
                {expense.quantity.value} {EXPENSE_UNIT_LABELS[expense.quantity.unit].toLowerCase()}
              </span>
            )}
            {perUnitDisplay && (
              <span className="text-primary font-medium">
                ({perUnitDisplay})
              </span>
            )}
          </div>
        </div>

        {/* Amount & Status */}
        <div className="text-right shrink-0">
          <div className={cn(
            'font-bold',
            expense.isPaid && 'text-muted-foreground'
          )}>
            ${expense.amount.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 justify-end">
            {expense.isPaid ? (
              <span className="text-xs text-green-500 font-medium">Paid</span>
            ) : (
              <span className="text-xs text-yellow-500 font-medium">Unpaid</span>
            )}
            {cancellableIcon[expense.isCancellable]}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-14 space-y-3">
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {expense.date && (
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span>{format(parseISO(expense.date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {expense.paymentMethod && (
                  <div>
                    <span className="text-muted-foreground">Payment: </span>
                    <span className="capitalize">{expense.paymentMethod.replace('_', ' ')}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Cancellable: </span>
                  <span className={cn(
                    expense.isCancellable === 'yes' && 'text-green-500',
                    expense.isCancellable === 'no' && 'text-destructive'
                  )}>
                    {expense.isCancellable === 'yes' ? 'Yes' : expense.isCancellable === 'no' ? 'No' : 'TBD'}
                  </span>
                </div>
                {expense.paidDate && (
                  <div>
                    <span className="text-muted-foreground">Paid: </span>
                    <span>{format(parseISO(expense.paidDate), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              {/* Cancellation Notes */}
              {expense.cancellationNotes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Cancellation policy: </span>
                  <span>{expense.cancellationNotes}</span>
                </div>
              )}

              {/* Notes */}
              {expense.notes && (
                <div className="text-sm bg-muted/50 p-2 rounded">
                  {expense.notes}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpenseItem;
