import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
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
import { 
  Bill, 
  BillCategory,
  PaymentMethod, 
  RecurringInterval,
  ResponsibleParty,
  PAYMENT_METHOD_LABELS,
  CATEGORY_LABELS,
  RECURRING_LABELS,
  RESPONSIBLE_PARTY_LABELS,
} from '@/types/bill';

interface QuickAddBillProps {
  onAdd: (bill: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const QuickAddBill = ({ onAdd, onClose }: QuickAddBillProps) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [category, setCategory] = useState<BillCategory | ''>('');
  const [responsibleParty, setResponsibleParty] = useState<ResponsibleParty | ''>('');

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
      category: category || undefined,
      responsibleParty: responsibleParty || undefined,
    });
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
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-dramatic p-6 pb-8 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Add Bill</h2>
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
            <Label htmlFor="name">Bill Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Electric Bill"
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

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as BillCategory)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Auto-detect or select" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsible Party */}
          <div className="space-y-2">
            <Label>Who's Responsible?</Label>
            <Select value={responsibleParty} onValueChange={(v) => setResponsibleParty(v as ResponsibleParty)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Optional - assign responsibility" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESPONSIBLE_PARTY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="recurring" className="cursor-pointer">
              Recurring bill
            </Label>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {/* Recurring Interval */}
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

          {/* Submit */}
          <Button
            type="submit"
            disabled={!name.trim()}
            className="btn-hero w-full"
          >
            Save Bill
          </Button>
        </form>
      </motion.div>
    </>
  );
};

export default QuickAddBill;
