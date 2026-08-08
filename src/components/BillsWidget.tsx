import { useNavigate } from 'react-router-dom';
import { Receipt, ChevronRight } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { RECURRING_LABELS, RecurringInterval } from '@/types/bill';
import { Bill } from '@/types/bill';
import { isDemoModeActive } from '@/demo/demoFlag';

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;

const metaLine = (bill: { isRecurring?: boolean; recurringInterval?: RecurringInterval; dueDate?: string }): string => {
  if (bill.isRecurring && bill.recurringInterval) {
    return RECURRING_LABELS[bill.recurringInterval];
  }
  const d = formatDate(bill.dueDate);
  return d ? `Due ${d}` : '';
};

const BillsWidget = ({ onOpen }: { onOpen: (bill: Bill) => void }) => {
  const navigate = useNavigate();
  const bills = BillService.getAllBills();
  const quiet = bills.filter((b) => b.status !== 'overdue' && b.status !== 'due_soon');

  if (quiet.length === 0) return null;

  const recent = [...quiet]
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 3);

  return (
    <div className="mb-6">
      <button
        onClick={() => navigate(isDemoModeActive() ? '/demo/bills' : '/bills')}
        className="flex items-center justify-between w-full mb-3"
      >
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bills</h2>
        <span className="text-xs text-primary flex items-center gap-1">
          View all ({bills.length}) <ChevronRight className="w-3 h-3" />
        </span>
      </button>
      <div className="space-y-2">
        {recent.map((bill) => (
          <button
            key={bill.id}
            onClick={() => onOpen(bill)}
            className="w-full bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
          >
            <Receipt className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{bill.name}</p>
              <p className="text-xs text-muted-foreground truncate">{metaLine(bill)}</p>
            </div>
            {bill.amount != null && (
              <p className="text-sm font-medium flex-shrink-0">${bill.amount.toFixed(2)}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BillsWidget;
