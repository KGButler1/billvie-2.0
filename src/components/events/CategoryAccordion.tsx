import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Filter } from 'lucide-react';
import { CategorySummary, EXPENSE_UNIT_LABELS } from '@/types/event';
import ExpenseItem from './ExpenseItem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CategoryAccordionProps {
  summary: CategorySummary;
  eventId: string;
  onExpenseUpdate: () => void;
  onEditExpense: (expenseId: string) => void;
}

const CategoryAccordion = ({ 
  summary, 
  eventId, 
  onExpenseUpdate,
  onEditExpense 
}: CategoryAccordionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'cancellable'>('all');

  const filteredExpenses = summary.expenses.filter(expense => {
    if (filter === 'unpaid') return !expense.isPaid;
    if (filter === 'cancellable') return expense.isCancellable === 'yes';
    return true;
  });

  const quantityDisplay = summary.totalQuantity && summary.quantityUnit
    ? `${summary.totalQuantity} ${EXPENSE_UNIT_LABELS[summary.quantityUnit].toLowerCase()}`
    : null;

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-3">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
      >
        <span className="text-xl">{summary.icon}</span>
        
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{summary.name}</span>
            <span className="text-sm text-muted-foreground">
              ({summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'})
            </span>
          </div>
          {quantityDisplay && (
            <div className="text-sm text-muted-foreground">
              {quantityDisplay}
            </div>
          )}
        </div>

        <div className="text-right">
          <span className="font-bold text-lg">
            ${summary.totalAmount.toLocaleString()}
          </span>
          <div className="text-xs text-muted-foreground">
            {summary.paidCount}/{summary.itemCount} paid
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Filter & Actions Bar */}
            <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-1">
                {(['all', 'unpaid', 'cancellable'] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All' : f === 'unpaid' ? 'Unpaid' : 'Cancellable'}
                  </Button>
                ))}
              </div>
              <div className="flex-1" />
              {summary.expenses.some(e => !e.isPaid) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    // Mark all as paid - handled in parent
                    onExpenseUpdate();
                  }}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Mark All Paid
                </Button>
              )}
            </div>

            {/* Expense List */}
            <div className="divide-y divide-border">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map(expense => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    eventId={eventId}
                    onUpdate={onExpenseUpdate}
                    onEdit={() => onEditExpense(expense.id)}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No {filter === 'all' ? '' : filter} expenses
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryAccordion;
