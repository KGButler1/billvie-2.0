import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomTaxCategory } from '@/types/sharing';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { cn } from '@/lib/utils';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged: () => void;
}

const EMOJI_OPTIONS = ['📁', '🏠', '🚗', '💻', '🎓', '🏥', '💼', '❤️', '📚', '🎨', '✈️', '🍽️', '🛒', '💰', '📱'];

export const ManageCategoriesModal = ({ isOpen, onClose, onCategoriesChanged }: ManageCategoriesModalProps) => {
  const [categories, setCategories] = useState<CustomTaxCategory[]>(() => TaxDocumentService.getCategories());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('📁');
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');

  if (!isOpen) return null;

  const refreshCategories = () => {
    setCategories(TaxDocumentService.getCategories());
    onCategoriesChanged();
  };

  const handleAddCategory = async () => {
    if (!newLabel.trim()) return;
    await TaxDocumentService.addCategory(newLabel.trim(), newIcon);
    setNewLabel('');
    setNewIcon('📁');
    setIsAdding(false);
    refreshCategories();
  };

  const handleStartEdit = (cat: CustomTaxCategory) => {
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditIcon(cat.icon);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editLabel.trim()) return;
    await TaxDocumentService.updateCategory(editingId, { label: editLabel.trim(), icon: editIcon });
    setEditingId(null);
    refreshCategories();
  };

  const handleDelete = async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat || cat.isDefault) return;
    
    if (confirm(`Delete category "${cat.label}"? Documents using this category will be moved to "Other".`)) {
      await TaxDocumentService.deleteCategory(id);
      refreshCategories();
    }
  };

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
        className="bg-card w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Manage Categories</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border border-border",
                cat.isDefault && "bg-muted/50"
              )}
            >
              {editingId === cat.id ? (
                <>
                  <div className="relative">
                    <select
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="text-xl bg-transparent border-none cursor-pointer appearance-none w-8"
                    >
                      {EMOJI_OPTIONS.map(emoji => (
                        <option key={emoji} value={emoji}>{emoji}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xl">{cat.icon}</span>
                  <span className="flex-1 font-medium">{cat.label}</span>
                  {cat.isDefault ? (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Default</span>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleStartEdit(cat)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {isAdding ? (
          <div className="border-t border-border pt-4 space-y-3">
            <Label>New Category</Label>
            <div className="flex gap-2">
              <select
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="text-xl bg-background border border-border rounded-lg px-2 cursor-pointer"
              >
                {EMOJI_OPTIONS.map(emoji => (
                  <option key={emoji} value={emoji}>{emoji}</option>
                ))}
              </select>
              <Input
                placeholder="Category name"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="flex-1"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAdding(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddCategory} disabled={!newLabel.trim()} className="flex-1">
                Add Category
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Category
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};
