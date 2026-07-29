import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Search, 
  Trash2,
  Settings,
  Calendar,
  Paperclip,
  Share2,
  Download,
  Lock
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
import { TaxDocument, TaxCategory, FileAttachment } from '@/types/sharing';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { UserService } from '@/services/UserService';
import BottomNav from '@/components/BottomNav';
import UpgradeModal from '@/components/UpgradeModal';
import ShareModal from '@/components/sharing/ShareModal';
import { ManageCategoriesModal } from '@/components/tax/ManageCategoriesModal';
import { ManageYearsModal } from '@/components/tax/ManageYearsModal';
import { TaxSharingPanel } from '@/components/tax/TaxSharingPanel';
import { FileAttachmentInput, AttachmentBadge } from '@/components/shared/FileAttachmentInput';
import { arrayToCSV, downloadCSV } from '@/utils/csvExport';
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
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageYears, setShowManageYears] = useState(false);
  const [categoriesVersion, setCategoriesVersion] = useState(0);

  const settings = UserService.getSettings();
  const isPaid = settings.userType === 'paid' || settings.userType === 'accountant';

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    setDocuments(TaxDocumentService.getAllDocuments());
  };

  const availableYears = TaxDocumentService.getAvailableYears();

  const allCategories = TaxDocumentService.getCategories();
  const getCategoryLabel = (id: string) => allCategories.find(c => c.id === id)?.label || id;
  const getCategoryIcon = (id: string) => allCategories.find(c => c.id === id)?.icon || '📄';

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === 'all' || doc.year === yearFilter;
    const matchesCategory = categoryFilter === 'all' || doc.categories.includes(categoryFilter);
    return matchesSearch && matchesYear && matchesCategory;
  });

  const handleDelete = (id: string) => {
    if (confirm('Delete this document? You can restore it from Recently Deleted within 30 days.')) {
      TaxDocumentService.deleteDocument(id);
      loadDocuments();
    }
  };

  const handleUpgrade = () => {
    UserService.saveSettings({ userType: 'paid', hasEventsAccess: true });
    setShowUpgradeModal(false);
  };

  const handleExportCSV = () => {
    const csv = arrayToCSV(
      filteredDocuments.map((doc) => ({
        name: doc.name,
        categories: doc.categories.map((c) => getCategoryLabel(c)).join('; '),
        year: doc.year,
        amount: doc.amount ?? '',
        notes: doc.notes ?? '',
        taxRelevant: doc.isTaxRelevant ? 'Yes' : 'No',
      })),
      [
        { key: 'name', label: 'Document' },
        { key: 'categories', label: 'Categories' },
        { key: 'year', label: 'Year' },
        { key: 'amount', label: 'Amount' },
        { key: 'notes', label: 'Notes' },
        { key: 'taxRelevant', label: 'Tax Relevant' },
      ]
    );
    const yearLabel = yearFilter === 'all' ? 'all-years' : String(yearFilter);
    downloadCSV(csv, `billvie-tax-export-${yearLabel}.csv`);
  };

  const categorySummary = yearFilter !== 'all' 
    ? TaxDocumentService.getCategorySummary(yearFilter)
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
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
                {allCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => (isPaid ? handleExportCSV() : setShowUpgradeModal(true))}
          >
            {isPaid ? <Download className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            Export for Accountant
          </Button>

          {/* Manage Categories/Years buttons */}
          <div className="flex gap-2 text-sm">
            <button 
              onClick={() => setShowManageCategories(true)}
              className="text-primary hover:underline flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              Manage Categories
            </button>
            <span className="text-muted-foreground">•</span>
            <button 
              onClick={() => setShowManageYears(true)}
              className="text-primary hover:underline flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              Manage Years
            </button>
          </div>
        </div>

        {/* Sharing Panel */}
        <TaxSharingPanel
          onAddShare={() => setShowShareModal(true)}
          onRequireUpgrade={() => setShowUpgradeModal(true)}
          isPaid={isPaid}
        />

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
                    <span>{getCategoryIcon(cat)}</span>
                    <span className="text-muted-foreground flex-1">{getCategoryLabel(cat)}</span>
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
                  {getCategoryIcon(doc.categories[0])}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{doc.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-1">
                      {doc.categories.map((catId, idx) => (
                        <span key={catId} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-xs">
                          {getCategoryIcon(catId)} {getCategoryLabel(catId)}
                        </span>
                      ))}
                    </div>
                    <span>•</span>
                    <span>{doc.year}</span>
                    {doc.amount && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-foreground">${doc.amount.toLocaleString()}</span>
                      </>
                    )}
                    {doc.attachment && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <Paperclip className="w-3 h-3" />
                        {doc.attachment.name.length > 15 
                          ? doc.attachment.name.substring(0, 12) + '...' 
                          : doc.attachment.name}
                      </span>
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
        onPreviewAnyway={() => setShowUpgradeModal(false)}
      />

      {/* Manage Categories Modal */}
      <AnimatePresence>
        {showManageCategories && (
          <ManageCategoriesModal
            isOpen={showManageCategories}
            onClose={() => setShowManageCategories(false)}
            onCategoriesChanged={() => setCategoriesVersion(v => v + 1)}
          />
        )}
      </AnimatePresence>

      {/* Manage Years Modal */}
      <AnimatePresence>
        {showManageYears && (
          <ManageYearsModal
            isOpen={showManageYears}
            onClose={() => setShowManageYears(false)}
            onYearsChanged={loadDocuments}
          />
        )}
      </AnimatePresence>

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
  const [selectedCategories, setSelectedCategories] = useState<TaxCategory[]>(['other']);
  const [year, setYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<FileAttachment | undefined>(undefined);

  const allCategories = TaxDocumentService.getCategories();
  const availableYears = TaxDocumentService.getAvailableYears();

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(catId)) {
        // Don't allow removing the last category
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== catId);
      }
      return [...prev, catId];
    });
  };

  const handleSave = () => {
    if (!name.trim() || selectedCategories.length === 0) return;

    TaxDocumentService.createDocument({
      name: name.trim(),
      categories: selectedCategories,
      year,
      amount: amount ? parseFloat(amount) : undefined,
      notes: notes.trim() || undefined,
      attachment,
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
        className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto"
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

          <div className="space-y-2">
            <Label>Categories (select one or more) *</Label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors",
                    selectedCategories.includes(cat.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
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

          <div className="space-y-2">
            <Label>Attach File (optional)</Label>
            <FileAttachmentInput
              attachment={attachment}
              onAttach={setAttachment}
              onRemove={() => setAttachment(undefined)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || selectedCategories.length === 0} className="flex-1">
              Save Document
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TaxDocuments;
