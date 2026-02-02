import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TaxDocumentService } from '@/services/TaxDocumentService';

interface ManageYearsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onYearsChanged: () => void;
}

export const ManageYearsModal = ({ isOpen, onClose, onYearsChanged }: ManageYearsModalProps) => {
  const [years, setYears] = useState<number[]>(() => TaxDocumentService.getAvailableYears());
  const [customYears, setCustomYears] = useState<number[]>(() => TaxDocumentService.getCustomYears());
  const [isAdding, setIsAdding] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();
  const defaultYears = [currentYear, currentYear - 1, currentYear - 2];

  if (!isOpen) return null;

  const refreshYears = () => {
    setYears(TaxDocumentService.getAvailableYears());
    setCustomYears(TaxDocumentService.getCustomYears());
    onYearsChanged();
  };

  const handleAddYear = () => {
    setError('');
    const yearNum = parseInt(newYear);
    
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 10) {
      setError('Please enter a valid year');
      return;
    }
    
    if (years.includes(yearNum)) {
      setError('This year already exists');
      return;
    }

    TaxDocumentService.addCustomYear(yearNum);
    setNewYear('');
    setIsAdding(false);
    refreshYears();
  };

  const handleRemoveYear = (year: number) => {
    const result = TaxDocumentService.removeCustomYear(year);
    if (!result.success && result.documentsExist) {
      alert('Cannot remove this year because documents exist for it. Delete those documents first.');
      return;
    }
    refreshYears();
  };

  const isDefaultYear = (year: number) => defaultYears.includes(year);
  const isCustomYear = (year: number) => customYears.includes(year);

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
        className="bg-card w-full max-w-sm rounded-2xl p-6 max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Manage Years</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Add years for historical documents or remove custom years.
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {years.map((year) => (
            <div
              key={year}
              className="flex items-center gap-3 p-3 rounded-lg border border-border"
            >
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 font-medium">{year}</span>
              {isDefaultYear(year) ? (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Default</span>
              ) : isCustomYear(year) ? (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveYear(year)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">In Use</span>
              )}
            </div>
          ))}
        </div>

        {isAdding ? (
          <div className="border-t border-border pt-4 space-y-3">
            <Label>Add Year</Label>
            <Input
              type="number"
              placeholder={`e.g., ${currentYear - 5}`}
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              min={1900}
              max={currentYear + 10}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsAdding(false); setError(''); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddYear} className="flex-1">
                Add Year
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Year
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};
