import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CalendarDays, CalendarRange, Plus, Trash2 } from 'lucide-react';
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
import { Event, EventType, EVENT_TYPE_LABELS, DatePrecision } from '@/types/bill';
import { cn } from '@/lib/utils';
import FieldError from '@/components/ui/field-error';
import { toDateString, toTimestamptz, monthToTimestamptz } from '@/utils/eventDate';

interface CreateEventModalProps {
  onAdd: (event: Omit<Event, 'id' | 'expenses' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  initialEvent?: Event;
  focusDates?: boolean;
}

const CreateEventModal = ({ onAdd, onClose, initialEvent, focusDates }: CreateEventModalProps) => {
  const isEdit = !!initialEvent;
  const [name, setName] = useState(initialEvent?.name ?? '');
  const [type, setType] = useState<EventType>(initialEvent?.type ?? 'travel');
  const [budget, setBudget] = useState(initialEvent?.budget != null ? String(initialEvent.budget) : '');
  const [nameError, setNameError] = useState('');
  const [dateError, setDateError] = useState('');

  // Date state
  const [hasStartDate, setHasStartDate] = useState(!!initialEvent?.startDate);
  const [datePrecision, setDatePrecision] = useState<DatePrecision>(initialEvent?.datePrecision ?? 'day');
  const [startDate, setStartDate] = useState(initialEvent?.startDate ? toDateString(initialEvent.startDate) ?? '' : '');
  const [startMonth, setStartMonth] = useState(() => {
    if (initialEvent?.startDate) {
      const d = new Date(initialEvent.startDate);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    return '';
  });
  const [hasEndDate, setHasEndDate] = useState(!!initialEvent?.endDate);
  const [endDate, setEndDate] = useState(initialEvent?.endDate ? toDateString(initialEvent.endDate) ?? '' : '');
  const [endMonth, setEndMonth] = useState(() => {
    if (initialEvent?.endDate) {
      const d = new Date(initialEvent.endDate);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    return '';
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (focusDates) {
      const el = document.getElementById('date-section');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusDates]);

  const validateDates = (): boolean => {
    if (!hasStartDate) {
      if (hasEndDate) {
        setDateError('Add a start date first, or remove the end date.');
        return false;
      }
      setDateError('');
      return true;
    }

    if (hasEndDate) {
      const startVal = datePrecision === 'day' ? startDate : startMonth;
      const endVal = datePrecision === 'day' ? endDate : endMonth;
      if (!startVal || !endVal) {
        setDateError('Pick both dates, or remove the end date.');
        return false;
      }
      if (endVal < startVal) {
        setDateError('End date must be on or after the start date.');
        return false;
      }
    }
    setDateError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNameError('Give this event a name.');
      return;
    }
    if (!validateDates()) return;

    let finalStart: string | undefined;
    let finalEnd: string | undefined;

    if (hasStartDate) {
      if (datePrecision === 'day') {
        finalStart = toTimestamptz(startDate) || undefined;
      } else {
        finalStart = monthToTimestamptz(startMonth) || undefined;
      }
    }

    if (hasEndDate && hasStartDate) {
      if (datePrecision === 'day') {
        finalEnd = toTimestamptz(endDate) || undefined;
      } else {
        finalEnd = monthToTimestamptz(endMonth) || undefined;
      }
    }

    setSubmitting(true);
    onAdd({
      name: name.trim(),
      type,
      budget: budget ? parseFloat(budget) : undefined,
      startDate: finalStart,
      endDate: finalEnd,
      datePrecision: hasStartDate ? datePrecision : 'day',
      status: initialEvent?.status ?? 'planning',
    });
  };

  const clearStartDate = () => {
    setHasStartDate(false);
    setStartDate('');
    setStartMonth('');
    setHasEndDate(false);
    setEndDate('');
    setEndMonth('');
    setDateError('');
  };

  const monthYearLabel = (val: string) => {
    if (!val) return '';
    const [y, m] = val.split('-').map(Number);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[m - 1]} ${y}`;
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

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="pointer-events-auto w-full sm:max-w-lg sm:rounded-2xl bg-card rounded-t-3xl shadow-dramatic p-6 pb-8 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{isEdit ? 'Edit Event' : 'Create Event'}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                placeholder="e.g., House Repairs"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                className={cn('h-12', nameError && 'border-destructive')}
                autoFocus={!focusDates}
              />
              <FieldError message={nameError} />
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
              <Label htmlFor="budget">Amount in mind (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="h-12 pl-7"
                />
              </div>
            </div>

            {/* Date section */}
            <div id="date-section" className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">When is it?</Label>
                {hasStartDate && (
                  <button
                    type="button"
                    onClick={clearStartDate}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear dates
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Optional, helps sort events and mark them complete when they're over.
              </p>

              {!hasStartDate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setHasStartDate(true); }}
                  className="w-full gap-1.5"
                >
                  <CalendarDays className="w-4 h-4" />
                  Add a date
                </Button>
              ) : (
                <>
                  {/* Precision toggle */}
                  <div className="flex gap-2" role="radiogroup" aria-label="Date precision">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={datePrecision === 'day'}
                      onClick={() => setDatePrecision('day')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg border transition-colors',
                        datePrecision === 'day'
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <CalendarDays className="w-4 h-4" />
                      Specific date
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={datePrecision === 'month'}
                      onClick={() => setDatePrecision('month')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg border transition-colors',
                        datePrecision === 'month'
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <CalendarRange className="w-4 h-4" />
                      Month only
                    </button>
                  </div>

                  {/* Start date input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                      {hasEndDate ? 'Start' : 'Date'}
                    </Label>
                    {datePrecision === 'day' ? (
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setDateError(''); }}
                        className="h-11"
                      />
                    ) : (
                      <Input
                        id="startDate"
                        type="month"
                        value={startMonth}
                        onChange={(e) => { setStartMonth(e.target.value); setDateError(''); }}
                        className="h-11"
                      />
                    )}
                  </div>

                  {/* End date */}
                  {!hasEndDate ? (
                    <button
                      type="button"
                      onClick={() => setHasEndDate(true)}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add end date
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="endDate" className="text-xs text-muted-foreground">End</Label>
                        <button
                          type="button"
                          onClick={() => { setHasEndDate(false); setEndDate(''); setEndMonth(''); setDateError(''); }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      {datePrecision === 'day' ? (
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => { setEndDate(e.target.value); setDateError(''); }}
                          className="h-11"
                        />
                      ) : (
                        <Input
                          id="endDate"
                          type="month"
                          value={endMonth}
                          onChange={(e) => { setEndMonth(e.target.value); setDateError(''); }}
                          className="h-11"
                        />
                      )}
                    </div>
                  )}

                  {datePrecision === 'month' && (startMonth || endMonth) && (
                    <p className="text-xs text-muted-foreground">
                      {hasEndDate && endMonth
                        ? `${monthYearLabel(startMonth)} – ${monthYearLabel(endMonth)}`
                        : monthYearLabel(startMonth)}
                    </p>
                  )}

                  <FieldError message={dateError} />
                </>
              )}
            </div>

            <Button
              type="submit"
              className="btn-hero w-full"
              disabled={submitting}
            >
              {isEdit ? 'Save Changes' : 'Create Event'}
            </Button>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default CreateEventModal;
