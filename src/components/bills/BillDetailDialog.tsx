import { motion } from 'framer-motion';
import { X, Pencil, CreditCard, TriangleAlert as AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Bill, PaymentMethod, PAYMENT_METHOD_LABELS, RECURRING_LABELS, CATEGORY_LABELS, BillCategory } from '@/types/bill';
import { CustomBillOptionsService } from '@/services/CustomBillOptionsService';
import { PaymentCardService } from '@/services/PaymentCardService';
import { BankAccountService } from '@/services/BankAccountService';
import { formatCardExpiry } from '@/types/paymentCard';
import { cardExpiryFlag, CARD_FLAG_LABELS } from '@/utils/cardExpiry';
import { PersonTagChips } from '@/components/people/PersonTags';
import { formatCurrency } from '@/utils/currency';
import ChangeHistoryLine from '@/components/bills/ChangeHistoryLine';

interface BillDetailDialogProps {
  bill: Bill;
  onEdit: () => void;
  onClose: () => void;
}

const label = (value: string | undefined, builtIn: Record<string, string>, custom: { id: string; label: string }[]) => {
  if (!value) return undefined;
  return builtIn[value] ?? custom.find((c) => c.id === value)?.label ?? value;
};

const Row = ({ label: name, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
    <span className="text-sm text-muted-foreground flex-shrink-0">{name}</span>
    <span className="text-sm text-right font-medium min-w-0">{children}</span>
  </div>
);

const BillDetailDialog = ({ bill, onEdit, onClose }: BillDetailDialogProps) => {
  const card = PaymentCardService.getById(bill.paymentCardId);
  const account = BankAccountService.getById(bill.bankAccountId);
  const flag = cardExpiryFlag(card);

  const categoryLabel = label(
    bill.category,
    CATEGORY_LABELS as Record<string, string>,
    CustomBillOptionsService.getCustomCategories()
  );
  const methodLabel = label(
    bill.paymentMethod,
    PAYMENT_METHOD_LABELS as Record<string, string>,
    CustomBillOptionsService.getCustomPaymentMethods()
  );

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
        className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-dramatic p-6 pb-8 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold min-w-0 break-words">{bill.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <Row label="Amount">
            {bill.amount !== undefined ? formatCurrency(bill.amount) : '—'}
          </Row>
          <Row label="Due date">
            {bill.dueDate ? format(parseISO(bill.dueDate), 'EEEE, d MMMM yyyy') : '—'}
          </Row>
          <Row label="Category">{categoryLabel ?? '—'}</Row>
          <Row label="Payment method">
            {methodLabel ? (
              <span className="inline-flex items-center gap-1.5 justify-end flex-wrap">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                {methodLabel}
                {card && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span>{card.nickname}</span>
                    {formatCardExpiry(card) && (
                      <span className="text-muted-foreground font-normal">
                        {formatCardExpiry(card)}
                      </span>
                    )}
                  </>
                )}
                {account && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span>{account.nickname}</span>
                    {account.lastDigits && (
                      <span className="text-muted-foreground font-normal">
                        ···{account.lastDigits}
                      </span>
                    )}
                  </>
                )}
              </span>
            ) : (
              '—'
            )}
          </Row>
          {flag && (
            <Row label="Heads up">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full status-overdue">
                <AlertTriangle className="w-3 h-3" />
                {CARD_FLAG_LABELS[flag]}
              </span>
            </Row>
          )}
          <Row label="Repeats">
            {bill.isRecurring && bill.recurringInterval
              ? RECURRING_LABELS[bill.recurringInterval]
              : 'One-time'}
          </Row>
          <Row label="Auto-debited">{bill.isAutoDebited ? 'Yes' : 'No'}</Row>
          <Row label="Notes">
            {bill.notes ? (
              <span className="whitespace-pre-line font-normal">{bill.notes}</span>
            ) : (
              '—'
            )}
          </Row>
          <Row label="Tagged people">
            {bill.taggedPersonIds?.length ? (
              <PersonTagChips personIds={bill.taggedPersonIds} />
            ) : (
              '—'
            )}
          </Row>
        </div>

        <ChangeHistoryLine
          createdAt={bill.createdAt}
          updatedAt={bill.updatedAt}
          className="text-xs text-muted-foreground mb-5"
        />

        <Button onClick={onEdit} className="w-full gap-2">
          <Pencil className="w-4 h-4" />
          Edit
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default BillDetailDialog;
