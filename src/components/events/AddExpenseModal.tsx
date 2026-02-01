import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CalendarIcon } from 'lucide-react';
import { Event, PAYMENT_METHOD_LABELS, PaymentMethod } from '@/types/bill';
import { 
  EventExpenseExtended, 
  ExpenseUnit, 
  CancellableStatus,
  EXPENSE_UNIT_LABELS 
} from '@/types/event';
import { EventService } from '@/services/EventService';
import { EventExpenseService } from '@/services/EventExpenseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AddExpenseModalProps {
  event: Event;
  editingExpenseId?: string | null;
  onClose: () => void;
  onSave: () => void;
}

const AddExpenseModal = ({ event, editingExpenseId, onClose, onSave }: AddExpenseModalProps) => {
  const categories = EventService.getTemplateCategories(event.type);
  const existingExpense = editingExpenseId 
    ? EventExpenseService.getExpenses(event.id).find(e => e.id === editingExpenseId)
    : null;

  const [formData, setFormData] = useState({
    category: existingExpense?.category || categories[0] || '',
    name: existingExpense?.name || '',
    vendor: existingExpense?.vendor || '',
    amount: existingExpense?.amount?.toString() || '',
    quantityValue: existingExpense?.quantity?.value?.toString() || '',
    quantityUnit: existingExpense?.quantity?.unit || 'items' as ExpenseUnit,
    date: existingExpense?.date ? new Date(existingExpense.date) : undefined as Date | undefined,
    paymentMethod: existingExpense?.paymentMethod || '',
    isPaid: existingExpense?.isPaid || false,
    isCancellable: existingExpense?.isCancellable || 'tbd' as CancellableStatus,
    cancellationNotes: existingExpense?.cancellationNotes || '',
    notes: existingExpense?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Description is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const expenseData: Omit<EventExpenseExtended, 'id' | 'eventId' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim(),
      vendor: formData.vendor.trim() || undefined,
      amount: parseFloat(formData.amount),
      category: formData.category,
      quantity: formData.quantityValue 
        ? { value: parseFloat(formData.quantityValue), unit: formData.quantityUnit }
        : undefined,
      date: formData.date?.toISOString(),
      paymentMethod: formData.paymentMethod || undefined,
      isPaid: formData.isPaid,
      paidDate: formData.isPaid ? new Date().toISOString() : undefined,
      isCancellable: formData.isCancellable,
      cancellationNotes: formData.isCancellable === 'yes' ? formData.cancellationNotes : undefined,
      notes: formData.notes.trim() || undefined,
    };

    if (editingExpenseId) {
      EventExpenseService.updateExpense(event.id, editingExpenseId, expenseData);
    } else {
      EventExpenseService.addExpense(event.id, expenseData);
    }

    onSave();
    onClose();
  };

  // Calculate per-unit cost for display
  const perUnitCost = formData.amount && formData.quantityValue
    ? parseFloat(formData.amount) / parseFloat(formData.quantityValue)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-card w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editingExpenseId ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              placeholder="e.g., Delta - SYD to LAX"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label>Company/Vendor (optional)</Label>
            <Input
              placeholder="e.g., Delta Airlines"
              value={formData.vendor}
              onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className={cn('pl-7', errors.amount && 'border-destructive')}
              />
            </div>
            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity (optional)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="e.g., 3"
                value={formData.quantityValue}
                onChange={(e) => setFormData(prev => ({ ...prev, quantityValue: e.target.value }))}
                className="flex-1"
              />
              <Select 
                value={formData.quantityUnit}
                onValueChange={(v) => setFormData(prev => ({ ...prev, quantityUnit: v as ExpenseUnit }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_UNIT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {perUnitCost && perUnitCost > 0 && (
              <p className="text-sm text-primary">
                Avg per {formData.quantityUnit.slice(0, -1)}: ${perUnitCost.toFixed(2)}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method (optional)</Label>
            <Select 
              value={formData.paymentMethod}
              onValueChange={(v) => setFormData(prev => ({ ...prev, paymentMethod: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paid Toggle */}
          <div className="flex items-center justify-between">
            <Label>Mark as Paid</Label>
            <Switch
              checked={formData.isPaid}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaid: checked }))}
            />
          </div>

          {/* Cancellable */}
          <div className="space-y-2">
            <Label>Cancellable?</Label>
            <Select 
              value={formData.isCancellable}
              onValueChange={(v) => setFormData(prev => ({ ...prev, isCancellable: v as CancellableStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No (Non-refundable)</SelectItem>
                <SelectItem value="tbd">TBD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cancellation Notes */}
          {formData.isCancellable === 'yes' && (
            <div className="space-y-2">
              <Label>Cancellation Policy Notes</Label>
              <Input
                placeholder="e.g., No penalty until Dec 28"
                value={formData.cancellationNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, cancellationNotes: e.target.value }))}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Additional details..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4">
          <Button onClick={handleSubmit} className="w-full">
            {editingExpenseId ? 'Save Changes' : 'Add Expense'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddExpenseModal;
