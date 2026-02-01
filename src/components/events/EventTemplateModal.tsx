import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Event } from '@/types/bill';
import { EventService } from '@/services/EventService';
import { format } from 'date-fns';

interface EventTemplateModalProps {
  templateEvent: Event;
  onClose: () => void;
  onCreate: (event: Event) => void;
}

const EventTemplateModal = ({ templateEvent, onClose, onCreate }: EventTemplateModalProps) => {
  const [name, setName] = useState(`${templateEvent.name} (Copy)`);
  const [copyAmounts, setCopyAmounts] = useState(false);
  const [budget, setBudget] = useState(templateEvent.budget?.toString() || '');

  const handleCreate = () => {
    if (!name.trim()) return;

    // Get unique categories from template
    const categories = [...new Set(templateEvent.expenses.map(e => e.category))];
    
    // Create new event with same type
    const newEvent = EventService.createEvent({
      name: name.trim(),
      type: templateEvent.type,
      budget: budget ? parseFloat(budget) : undefined,
      status: 'planning',
    });

    // If copying amounts, also copy expense structure
    if (copyAmounts && newEvent) {
      templateEvent.expenses.forEach(expense => {
        EventService.addExpense(newEvent.id, {
          name: expense.name,
          amount: expense.amount,
          category: expense.category,
          isPaid: false,
        });
      });
    }

    if (newEvent) {
      onCreate(newEvent);
    }
    onClose();
  };

  const uniqueCategories = [...new Set(templateEvent.expenses.map(e => e.category))];
  const totalExpenses = templateEvent.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl w-full max-w-md p-6 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Copy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Create from Template</h2>
              <p className="text-sm text-muted-foreground">
                Based on "{templateEvent.name}"
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template preview */}
        <div className="bg-muted/50 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Template includes:</span>
          </div>
          <ul className="text-sm space-y-1">
            <li>• {uniqueCategories.length} categories: {uniqueCategories.slice(0, 3).join(', ')}{uniqueCategories.length > 3 ? '...' : ''}</li>
            <li>• {templateEvent.expenses.length} expense items</li>
            <li>• Total: ${totalExpenses.toLocaleString()}</li>
          </ul>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">New Event Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter event name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="copyAmounts" className="font-medium">Copy estimated amounts</Label>
              <p className="text-xs text-muted-foreground">
                Include expense items with amounts from template
              </p>
            </div>
            <Switch
              id="copyAmounts"
              checked={copyAmounts}
              onCheckedChange={setCopyAmounts}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()} className="flex-1">
              Create Event
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EventTemplateModal;
