import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Search, 
  Filter,
  Trash2,
  Share2,
  Lock,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaxDocument, TaxCategory, TAX_CATEGORY_LABELS, TAX_CATEGORY_ICONS } from '@/types/sharing';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { UserService } from '@/services/UserService';
import BottomNav from '@/components/BottomNav';
import UpgradeModal from '@/components/UpgradeModal';
import ShareModal from '@/components/sharing/ShareModal';
import { cn } from '@/lib/utils';

const TaxDocuments = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaxCategory | 'all'>('all');
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const settings = UserService.getSettings();
  const isPaid = settings.userType === 'paid' || settings.userType === 'accountant';

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    setDocuments(TaxDocumentService.getAllDocuments());
  };

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === 'all' || doc.year === yearFilter;
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesYear && matchesCategory;
  });

  const handleDelete = (id: string) => {
    if (confirm('Delete this document?')) {
      TaxDocumentService.deleteDocument(id);
      loadDocuments();
    }
  };

  const handleUpgrade = () => {
    UserService.saveSettings({ userType: 'paid', hasEventsAccess: true });
    setShowUpgradeModal(false);
  };

  const categorySummary = yearFilter !== 'all' 
    ? TaxDocumentService.getCategorySummary(yearFilter)
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/more')} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Tax Documents</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => isPaid ? setShowShareModal(true) : setShowUpgradeModal(true)}
          >
            {isPaid ? <Share2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Search and Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={String(yearFilter)} onValueChange={(v) => setYearFilter(v === 'all' ? 'all' : parseInt(v))}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TaxCategory | 'all')}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(TAX_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Year Summary */}
        {categorySummary && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <h3 className="text-sm font-medium mb-3">
              {yearFilter} Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(categorySummary).map(([cat, data]) => (
                data.count > 0 && (
                  <div key={cat} className="flex items-center gap-2 text-sm">
                    <span>{TAX_CATEGORY_ICONS[cat as TaxCategory]}</span>
                    <span className="text-muted-foreground flex-1">{TAX_CATEGORY_LABELS[cat as TaxCategory]}</span>
                    <span className="font-medium">${data.total.toLocaleString()}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="space-y-3">
          {filteredDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                  {TAX_CATEGORY_ICONS[doc.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{doc.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{TAX_CATEGORY_LABELS[doc.category]}</span>
                    <span>•</span>
                    <span>{doc.year}</span>
                    {doc.amount && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-foreground">${doc.amount.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                  {doc.notes && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{doc.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}

          {filteredDocuments.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No documents found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || yearFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first tax document to get started'}
              </p>
              <Button onClick={() => setIsAddingDocument(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </motion.div>
          )}
        </div>
      </main>

      {/* FAB */}
      {filteredDocuments.length > 0 && (
        <motion.button
          onClick={() => setIsAddingDocument(true)}
          className="fab"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Add Document Modal */}
      <AnimatePresence>
        {isAddingDocument && (
          <AddTaxDocumentModal
            onClose={() => setIsAddingDocument(false)}
            onSave={loadDocuments}
          />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            type="tax_documents"
            resourceName="Tax Documents"
            onRequireUpgrade={() => setShowUpgradeModal(true)}
          />
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="general"
        onUpgrade={handleUpgrade}
      />

      <BottomNav />
    </div>
  );
};

// Add Tax Document Modal
interface AddTaxDocumentModalProps {
  onClose: () => void;
  onSave: () => void;
}

const AddTaxDocumentModal = ({ onClose, onSave }: AddTaxDocumentModalProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TaxCategory>('other');
  const [year, setYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2];

  const handleSave = () => {
    if (!name.trim()) return;

    TaxDocumentService.createDocument({
      name: name.trim(),
      category,
      year,
      amount: amount ? parseFloat(amount) : undefined,
      notes: notes.trim() || undefined,
      isTaxRelevant: true,
    });

    onSave();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Add Tax Document</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Document Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Red Cross Donation Receipt"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TaxCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TAX_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {TAX_CATEGORY_ICONS[value as TaxCategory]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tax Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()} className="flex-1">
              Save Document
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TaxDocuments;
