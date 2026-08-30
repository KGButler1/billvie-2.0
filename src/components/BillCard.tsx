import { motion, AnimatePresence } from 'framer-motion';
import { Check, RotateCcw, Trash2, CreditCard, RefreshCw, Zap, Pencil, TriangleAlert as AlertTriangle, Link2, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react';
import { Bill, PaymentMethod, PAYMENT_METHOD_LABELS, RECURRING_LABELS } from '@/types/bill';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CategoryBadge from './CategoryBadge';
import { PersonTagChips } from '@/components/people/PersonTags';
import { CustomBillOptionsService } from '@/services/CustomBillOptionsService';
import { PaymentCardService } from '@/services/PaymentCardService';
import { cardExpiryFlag, CARD_FLAG_LABELS } from '@/utils/cardExpiry';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { DocumentService } from '@/services/DocumentService';
import { AttachmentService } from '@/services/AttachmentService';
import { useState, useEffect } from 'react';
import DocumentViewerModal from '@/components/documents/DocumentViewerModal';
import type { DocumentAttachment } from '@/services/AttachmentService';

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
  const isProcessing = bill.extractionStatus === 'processing';
  const needsReview = bill.extractionStatus === 'needs_review';
  const isFailed = bill.extractionStatus === 'failed';
  const card = PaymentCardService.getById(bill.paymentCardId);
  const cardFlag = cardExpiryFlag(card);
  const linkedDocId = DocumentLinkService.getLinkedDocumentIdForBill(bill.id);
  const linkedDoc = linkedDocId ? DocumentService.getById(linkedDocId) : undefined;
  const [linkedAttachments, setLinkedAttachments] = useState<DocumentAttachment[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!linkedDoc) { setLinkedAttachments([]); return; }
    let active = true;
    (async () => {
      const atts = await AttachmentService.getForOwner('document', linkedDoc.id);
      if (active) setLinkedAttachments(atts);
    })();
    return () => { active = false; };
  }, [linkedDoc]);


  
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
    pending: 'Upcoming',
  };

  return (
    <>
    <motion.div
      layout
      onClick={() => onOpen?.(bill)}
      className={cn(
        'card-bill relative',
        isPaid && 'opacity-60',
        onOpen && 'cursor-pointer',
        isProcessing && 'ring-1 ring-primary/30',
        needsReview && 'ring-2 ring-amber-400/50'
      )}
    >
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
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <>
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
              </>
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

          {linkedDoc && (
            <p
              className={cn(
                'text-xs text-muted-foreground mt-1.5 flex items-center gap-1 min-w-0',
                linkedAttachments.length > 0 && 'cursor-pointer hover:text-foreground transition-colors'
              )}
              onClick={linkedAttachments.length > 0 ? (e) => { e.stopPropagation(); setViewerIndex(0); } : undefined}
            >
              <Link2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">Linked to {linkedDoc.title}</span>
            </p>
          )}



        </div>

        {/* Status + extraction badges */}
        <div className={cn('flex flex-col items-end gap-1.5 flex-shrink-0')}>
        {isProcessing ? (
          <div className="flex items-center gap-1.5 text-xs text-primary px-2.5 py-1 rounded-full bg-primary/10">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Reading...</span>
          </div>
        ) : needsReview ? (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex-shrink-0"
          >
            Review
          </motion.span>
        ) : isFailed ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-destructive/10 text-destructive flex-shrink-0">
            Couldn't read
          </span>
        ) : bill.isSample ? (
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground flex-shrink-0">
            Sample
          </span>
        ) : (
          <span className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0',
            statusStyles[bill.status]
          )}>
            {statusLabels[bill.status]}
          </span>
        )}
        {cardFlag && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full status-overdue inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {CARD_FLAG_LABELS[cardFlag]}
          </span>
        )}
        </div>
      </div>

      {/* Failed message */}
      {isFailed && (
        <p className="text-xs text-destructive mt-1.5">
          Couldn't quite read this one. Tap to enter the details manually.
        </p>
      )}

      {/* Actions */}
      <div
        className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Extracting details...</span>
          </div>
        ) : isFailed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(bill)}
            className="text-primary hover:text-primary px-2.5"
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Enter manually
          </Button>
        ) : isPaid ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkUnpaid(bill.id)}
            className="text-muted-foreground hover:text-foreground px-2.5"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Mark Unpaid
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkPaid(bill.id)}
            className="text-status-paid hover:bg-status-paid/10 px-2.5"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Mark as Handled
          </Button>
        )}

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onEdit && !isFailed && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${bill.name}`}
              onClick={() => onEdit(bill)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
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
      </div>
    </motion.div>

    {viewerIndex !== null && linkedAttachments.length > 0 && (
      <DocumentViewerModal
        attachments={linkedAttachments}
        initialIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    )}
    </>
  );
};

export default BillCard;
