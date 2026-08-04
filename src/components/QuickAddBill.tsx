import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Bill,
  BillCategory,
  PaymentMethod,
  RecurringInterval,
  PAYMENT_METHOD_LABELS,
  CATEGORY_LABELS,
  RECURRING_LABELS,
} from '@/types/bill';
import { PersonTagPicker } from '@/components/people/PersonTags';
import CardPicker from '@/components/bills/CardPicker';
import { CustomBillOptionsService, CustomOption } from '@/services/CustomBillOptionsService';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { DocumentService } from '@/services/DocumentService';
import LinkPicker, { LinkPickerOption } from '@/components/shared/LinkPicker';
import TaxRelevanceFields, {
  TaxRelevanceValue,
  emptyTaxRelevance,
} from '@/components/tax/TaxRelevanceFields';
import { TaxTagService } from '@/services/TaxTagService';


interface QuickAddBillProps {
  onAdd: (
    bill: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
    linkedDocumentId?: string,
    tax?: TaxRelevanceValue
  ) => void;
  onClose: () => void;
  /** When provided with mode="edit", the form pre-fills and saves back to this bill. */
  initialBill?: Bill;
  mode?: 'add' | 'edit';
}

const ADD_NEW_VALUE = '__add_new__';

const QuickAddBill = ({ onAdd, onClose, initialBill, mode = 'add' }: QuickAddBillProps) => {
  const isEdit = mode === 'edit';
  const [name, setName] = useState(initialBill?.name ?? '');
  const [amount, setAmount] = useState(
    initialBill?.amount !== undefined ? String(initialBill.amount) : ''
  );
  const [dueDate, setDueDate] = useState(initialBill?.dueDate?.slice(0, 10) ?? '');
  const [isRecurring, setIsRecurring] = useState(initialBill?.isRecurring ?? false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>(
    initialBill?.recurringInterval ?? 'monthly'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | string>(
    initialBill?.paymentMethod ?? ''
  );
  const [paymentCardId, setPaymentCardId] = useState<string | undefined>(initialBill?.paymentCardId);
  const [isAutoDebited, setIsAutoDebited] = useState(initialBill?.isAutoDebited ?? false);
  const [category, setCategory] = useState<BillCategory | string>(initialBill?.category ?? '');
  const [notes, setNotes] = useState(initialBill?.notes ?? '');
  const [taggedPersonIds, setTaggedPersonIds] = useState<string[]>(
    initialBill?.taggedPersonIds ?? []
  );

  const [tax, setTax] = useState<TaxRelevanceValue>(() => {
    const base = emptyTaxRelevance(initialBill?.dueDate);
    if (!initialBill) return base;
    const existing = TaxTagService.getTagForItem(initialBill.id, 'bill', base.taxYear);
    return existing
      ? {
          enabled: true,
          taxYear: existing.taxYear,
          taxType: existing.taxType ?? 'personal',
          businessName: existing.businessName,
        }
      : base;
  });

  const [linkedDocument, setLinkedDocument] = useState<LinkPickerOption | null>(() => {
    if (!initialBill) return null;
    const docId = DocumentLinkService.getLinkedDocumentIdForBill(initialBill.id);
    const doc = docId ? DocumentService.getAll().find((d) => d.id === docId) : undefined;
    return doc ? { id: doc.id, label: doc.title } : null;
  });

  const documentOptions = useMemo(
    () => DocumentService.getAll().map((d) => ({ id: d.id, label: d.title })),
    []
  );

  const handleLinkedDocumentChange = (option: LinkPickerOption | null) => {
    setLinkedDocument(option);
    if (!initialBill) return; // create mode: applied after save via onAdd instead

    if (option) {
      DocumentLinkService.linkToBill(option.id, initialBill.id);
    } else {
      const currentDocId = DocumentLinkService.getLinkedDocumentIdForBill(initialBill.id);
      if (currentDocId) {
        const linkId = DocumentLinkService.findActiveLinkId(currentDocId, initialBill.id);
        if (linkId) DocumentLinkService.unlink(linkId);
      }
    }
  };

  const handleCreateDocument = (docName: string): LinkPickerOption => {
    const type = category === 'insurance' ? 'insurance' : 'other';
    const created = DocumentService.add({ title: docName, provider: '', type });
    return { id: created.id, label: created.title };
  };


  // Custom options
  const [customCategories, setCustomCategories] = useState<CustomOption[]>([]);
  const [customPaymentMethods, setCustomPaymentMethods] = useState<CustomOption[]>([]);

  // Adding new option states
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPaymentMethodName, setNewPaymentMethodName] = useState('');

  // Load custom options on mount
  useEffect(() => {
    setCustomCategories(CustomBillOptionsService.getCustomCategories());
    setCustomPaymentMethods(CustomBillOptionsService.getCustomPaymentMethods());
  }, []);


  const handleCategoryChange = (value: string) => {
    if (value === ADD_NEW_VALUE) {
      setIsAddingCategory(true);
    } else {
      setCategory(value);
    }
  };

  const handlePaymentMethodChange = (value: string) => {
    if (value === ADD_NEW_VALUE) {
      setIsAddingPaymentMethod(true);
    } else {
      setPaymentMethod(value);
    }
  };


  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newOption = CustomBillOptionsService.addCustomCategory(newCategoryName);
      setCustomCategories(CustomBillOptionsService.getCustomCategories());
      setCategory(newOption.id);
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleAddPaymentMethod = () => {
    if (newPaymentMethodName.trim()) {
      const newOption = CustomBillOptionsService.addCustomPaymentMethod(newPaymentMethodName);
      setCustomPaymentMethods(CustomBillOptionsService.getCustomPaymentMethods());
      setPaymentMethod(newOption.id);
      setNewPaymentMethodName('');
      setIsAddingPaymentMethod(false);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      amount: amount ? parseFloat(amount) : undefined,
      dueDate: dueDate || undefined,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      paymentMethod: paymentMethod || undefined,
      paymentCardId: paymentMethod === 'credit_card' ? paymentCardId : undefined,
      isAutoDebited,
      category: category || undefined,
      notes: notes.trim() || undefined,
      taggedPersonIds: taggedPersonIds.length ? taggedPersonIds : undefined,
    }, !isEdit ? linkedDocument?.id : undefined, tax);
  };

  // Helper to get display label for custom options
  const getCategoryLabel = (value: string): string => {
    if (CATEGORY_LABELS[value as BillCategory]) {
      return CATEGORY_LABELS[value as BillCategory];
    }
    const custom = customCategories.find(c => c.id === value);
    return custom?.label || value;
  };

  const getPaymentMethodLabel = (value: string): string => {
    if (PAYMENT_METHOD_LABELS[value as PaymentMethod]) {
      return PAYMENT_METHOD_LABELS[value as PaymentMethod];
    }
    const custom = customPaymentMethods.find(m => m.id === value);
    return custom?.label || value;
  };


  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="pointer-events-auto w-full sm:max-w-lg sm:rounded-2xl bg-card rounded-t-3xl shadow-dramatic p-6 pb-8 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">{isEdit ? 'Edit Bill' : 'Add Household Bill'}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name - Required */}
          <div className="space-y-2">
            <Label htmlFor="name">What is it? *</Label>
            <Input
              id="name"
              placeholder="e.g., Electricity, Internet, Council rates"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="h-12"
            />
          </div>

          {/* Amount and Due Date - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          {/* Recurring Toggle — right after Amount/Due Date */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="recurring" className="cursor-pointer">
              This repeats regularly
            </Label>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {/* Recurring Interval — only relevant when toggle is on */}
          {isRecurring && (
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={recurringInterval} onValueChange={(v) => setRecurringInterval(v as RecurringInterval)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRING_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            {isAddingCategory ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="h-12 flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    } else if (e.key === 'Escape') {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="h-12 w-12"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }}
                  className="h-12 w-12"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Auto-detect or select">
                    {category ? getCategoryLabel(category) : 'Auto-detect or select'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                  {customCategories.map((custom) => (
                    <SelectItem key={custom.id} value={custom.id}>
                      {custom.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={ADD_NEW_VALUE} className="text-primary font-medium">
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add new category...
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            {isAddingPaymentMethod ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter payment method"
                  value={newPaymentMethodName}
                  onChange={(e) => setNewPaymentMethodName(e.target.value)}
                  className="h-12 flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPaymentMethod();
                    } else if (e.key === 'Escape') {
                      setIsAddingPaymentMethod(false);
                      setNewPaymentMethodName('');
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAddPaymentMethod}
                  disabled={!newPaymentMethodName.trim()}
                  className="h-12 w-12"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingPaymentMethod(false);
                    setNewPaymentMethodName('');
                  }}
                  className="h-12 w-12"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select payment method">
                    {paymentMethod ? getPaymentMethodLabel(paymentMethod) : 'Select payment method'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                  {customPaymentMethods.map((custom) => (
                    <SelectItem key={custom.id} value={custom.id}>
                      {custom.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={ADD_NEW_VALUE} className="text-primary font-medium">
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add new payment method...
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Payment card — only relevant for credit cards */}
          {paymentMethod === 'credit_card' && (
            <div className="space-y-2">
              <Label>Which card?</Label>
              <CardPicker value={paymentCardId} onChange={setPaymentCardId} />
            </div>
          )}

          {/* Auto-debited toggle — sits with the payment-mechanics cluster */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="auto-debited" className="cursor-pointer">
                Auto-debited
              </Label>
              <p className="text-xs text-muted-foreground">
                This bill pays itself — no action needed when it's due
              </p>
            </div>
            <Switch
              id="auto-debited"
              checked={isAutoDebited}
              onCheckedChange={setIsAutoDebited}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="bill-notes">Notes</Label>
            <Textarea
              id="bill-notes"
              placeholder="Anything someone else would need to know"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Person tags */}
          <div className="space-y-2">
            <Label>For someone in particular?</Label>
            <PersonTagPicker value={taggedPersonIds} onChange={setTaggedPersonIds} scope="bills" />
          </div>

          <div className="space-y-2">
            <Label>Linked document</Label>
            <div>
              <LinkPicker
                triggerLabel="Link a document"
                emptyLabel="No documents yet — type a name to create one"
                createLabel={(q) => `Create document: ${q}`}
                options={documentOptions}
                value={linkedDocument}
                onChange={handleLinkedDocumentChange}
                onCreate={handleCreateDocument}
                initialQuery={name}
                chipIcon={Link2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For things like an insurance policy or account this bill pays for
            </p>
          </div>


          {/* Tax relevance */}
          <div className="space-y-2">
            <TaxRelevanceFields value={tax} onChange={setTax} />
            <p className="text-xs text-muted-foreground">
              This shows up in Tax Documents for that year — the bill itself doesn't change.
            </p>
          </div>

          {/* Trust signal */}
          <p className="text-xs text-muted-foreground text-center">
            We never store your login credentials or bank details
          </p>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!name.trim()}
            className="btn-hero w-full"
          >
            {isEdit ? 'Save Changes' : 'Save Bill'}
          </Button>
        </form>
      </motion.div>
      </div>
    </>
  );
};

export default QuickAddBill;
