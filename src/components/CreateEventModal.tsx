import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Event, EventType, EVENT_TYPE_LABELS } from '@/types/bill';

interface CreateEventModalProps {
  onAdd: (event: Omit<Event, 'id' | 'expenses' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const CreateEventModal = ({ onAdd, onClose }: CreateEventModalProps) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('travel');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      type,
      budget: budget ? parseFloat(budget) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: 'planning',
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
      />

      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-dramatic p-6 pb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Create Event</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Dallas Birthday Trip 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EventType)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget (Optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="budget"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="h-12 pl-7"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!name.trim()}
            className="btn-hero w-full"
          >
            Create Event
          </Button>
        </form>
      </motion.div>
    </>
  );
};

export default CreateEventModal;
