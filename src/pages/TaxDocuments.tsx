import { useState, useEffect, useMemo } from 'react';
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
  Users,
  Download,
  Lock,
  Link2,
  Receipt,
  ChevronDown,
  ChevronRight,
  X,
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
import { TaxTagService } from '@/services/TaxTagService';
import { UserService } from '@/services/UserService';
import { Bill } from '@/types/bill';
import { HouseholdDocument } from '@/types/document';
import BottomNav from '@/components/BottomNav';
import DismissibleIntro from '@/components/DismissibleIntro';
import UpgradeModal from '@/components/UpgradeModal';
import { ManageCategoriesModal } from '@/components/tax/ManageCategoriesModal';
import { ManageYearsModal } from '@/components/tax/ManageYearsModal';
import { TaxSharingPanel } from '@/components/tax/TaxSharingPanel';
import TaxAccessSheet from '@/components/tax/TaxAccessSheet';
import LinkTaxItemsSheet from '@/components/tax/LinkTaxItemsSheet';
import { FileAttachmentInput, AttachmentBadge } from '@/components/shared/FileAttachmentInput';
import { arrayToCSV, downloadCSV } from '@/utils/csvExport';
import { cn } from '@/lib/utils';
import { SkeletonRows } from '@/components/ui/skeleton';
import { usePlan } from '@/hooks/usePlan';
import { startCheckout } from '@/services/CheckoutService';

type RowSource = 'tax' | 'bill' | 'document';

interface TaxRow {
  key: string;
  itemId: string;
  source: RowSource;
  name: string;
  categories: string[];
  year: number;
  amount?: number;
  notes?: string;
  attachmentName?: string;
  taxType: 'personal' | 'business';
  businessName?: string;
  carriedFromYear?: number;
  taxDoc?: TaxDocument;
}

const TaxDocuments = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [tagVersion, setTagVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<number>(() => new Date().getFullYear());
  const [categoryFilter, setCategoryFilter] = useState<TaxCategory | 'all'>('all');
  const [businessFilter, setBusinessFilter] = useState<string | 'all'>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageYears, setShowManageYears] = useState(false);
  const [categoriesVersion, setCategoriesVersion] = useState(0);
  const [accessTarget, setAccessTarget] = useState<{ id: string; title: string } | null>(null);
  const [linkingTaxDoc, setLinkingTaxDoc] = useState<TaxDocument | null>(null);
  const [isLoading, setIsLoading] = useState(() => !TaxDocumentService.isLoaded());

  const { isPaid } = usePlan();

  const loadDocuments = () => {
    setDocuments(TaxDocumentService.getAllDocuments());
  };

  useEffect(() => {
    TaxDocumentService.refresh().then(loadDocuments).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  // Carrying forward means nobody has to re-tag a year from scratch. It only
  // ever runs for a year that has nothing tagged yet.
  useEffect(() => {
    TaxTagService.carryForwardIfNeeded(yearFilter);
    setTagVersion((v) => v + 1);
  }, [yearFilter]);

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from(
      new Set<number>([
        current,
        yearFilter,
        ...TaxDocumentService.getAvailableYears(),
        ...TaxTagService.getYearsWithTags(),
      ])
    ).sort((a, b) => b - a);
  }, [documents, tagVersion, yearFilter]);

  const allCategories = useMemo(() => TaxDocumentService.getCategories(), [categoriesVersion]);
  const getCategoryLabel = (id: string) => allCategories.find((c) => c.id === id)?.label || id;
  const getCategoryIcon = (id: string) => allCategories.find((c) => c.id === id)?.icon || '📄';

  // ---- Rows: direct tax entries + tagged bills/documents, one list ----
  const allRows: TaxRow[] = useMemo(() => {
    const direct: TaxRow[] = documents
      .filter((d) => d.year === yearFilter)
      .map((doc) => ({
        key: `tax_${doc.id}`,
        itemId: doc.id,
        source: 'tax' as const,
        name: doc.name,
        categories: doc.categories.length ? doc.categories : ['other'],
        year: doc.year,
        amount: doc.amount,
        notes: doc.notes,
        attachmentName: doc.attachment?.name,
        taxType: 'personal' as const,
        taxDoc: doc,
      }));

    const tagged: TaxRow[] = TaxTagService.getResolvedItemsForYear(yearFilter).map(({ item, tag }) => {
      const isBill = tag.itemType === 'bill';
      const bill = item as Bill;
      const doc = item as HouseholdDocument;
      return {
        key: `tag_${tag.id}`,
        itemId: tag.itemId,
        source: (isBill ? 'bill' : 'document') as RowSource,
        name: isBill ? bill.name : doc.title,
        categories: tag.categories?.length ? tag.categories : ['other'],
        year: tag.taxYear,
        amount: isBill ? bill.amount : undefined,
        notes: isBill ? bill.notes : doc.notes,
        taxType: tag.taxType ?? 'personal',
        businessName: tag.businessName,
        carriedFromYear: tag.origin === 'carried' ? tag.carriedFromYear : undefined,
      };
    });

    return [...direct, ...tagged];
  }, [documents, yearFilter, tagVersion]);

  const businessNames = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.businessName).filter(Boolean) as string[])),
    [allRows]
  );

  const rows = useMemo(
    () =>
      allRows.filter((row) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          q === '' || row.name.toLowerCase().includes(q) || (row.notes ?? '').toLowerCase().includes(q);
        const matchesCategory = categoryFilter === 'all' || row.categories.includes(categoryFilter);
        const matchesBusiness = businessFilter === 'all' || row.businessName === businessFilter;
        return matchesSearch && matchesCategory && matchesBusiness;
      }),
    [allRows, searchQuery, categoryFilter, businessFilter]
  );

  // Grouped by the row's first category — keeps every row counted exactly once.
  const sections = useMemo(() => {
    const map = new Map<string, TaxRow[]>();
    rows.forEach((row) => {
      const cat = row.categories[0];
      map.set(cat, [...(map.get(cat) ?? []), row]);
    });
    return Array.from(map.entries()).sort((a, b) =>
      getCategoryLabel(a[0]).localeCompare(getCategoryLabel(b[0]))
    );
  }, [rows, allCategories]);

  const grandTotal = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const unpricedCount = rows.filter((r) => r.amount === undefined).length;
  const personalTotal = rows.filter((r) => r.taxType === 'personal').reduce((s, r) => s + (r.amount ?? 0), 0);
  const businessTotal = rows.filter((r) => r.taxType === 'business').reduce((s, r) => s + (r.amount ?? 0), 0);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this document? You can restore it from Recently Deleted within 30 days.')) {
      await TaxDocumentService.deleteDocument(id);
      loadDocuments();
    }
  };

  const handleRemoveFromTax = (row: TaxRow) => {
    TaxTagService.untagItem(row.itemId, row.source === 'bill' ? 'bill' : 'document', row.year);
    setTagVersion((v) => v + 1);
  };

  const handleUpgrade = async () => {
    try {
      await startCheckout();
    } catch (error) {
      console.error('Unable to start checkout:', error);
    }
  };

  const handleExportCSV = () => {
    const csv = arrayToCSV(
      rows.map((row) => ({
        name: row.name,
        source: row.source === 'tax' ? 'Tax entry' : row.source === 'bill' ? 'Bill' : 'Document',
        categories: row.categories.map((c) => getCategoryLabel(c)).join('; '),
        year: row.year,
        amount: row.amount ?? '',
        taxType: row.taxType === 'business' ? 'Business' : 'Personal',
        businessName: row.businessName ?? '',
        notes: row.notes ?? '',
        status: row.carriedFromYear ? `Carried from ${row.carriedFromYear}` : 'New',
      })),
      [
        { key: 'name', label: 'Item' },
        { key: 'source', label: 'Source' },
        { key: 'categories', label: 'Categories' },
        { key: 'year', label: 'Year' },
        { key: 'amount', label: 'Amount' },
        { key: 'taxType', label: 'Personal/Business' },
        { key: 'businessName', label: 'Business' },
        { key: 'notes', label: 'Notes' },
        { key: 'status', label: 'Status' },
      ]
    );
    downloadCSV(csv, `billvie-tax-export-${yearFilter}.csv`);
  };

  const SourceIcon = ({ source }: { source: RowSource }) =>
    source === 'bill' ? (
      <Receipt className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="From a bill" />
    ) : source === 'document' ? (
      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="From a document" />
    ) : null;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pt-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/more')} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Tax Documents</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/people')}>
            <Users className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 lg:pt-8">
        <h1 className="text-2xl font-semibold hidden lg:block mb-2">Tax Documents</h1>
        <DismissibleIntro storageKey="billvie_tax_intro">
          Anything tagged relevant for tax on a bill or a document shows up here automatically. Add something here directly too, if it doesn't live anywhere else.
        </DismissibleIntro>

        {/* Year Summary */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }} className="mb-6">
              <SkeletonRows rows={4} />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
              {rows.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-4 mb-6">
                  <p className="text-sm text-muted-foreground">{yearFilter} total</p>
                  <p className="text-3xl font-semibold">${grandTotal.toLocaleString()}</p>
                  {unpricedCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {unpricedCount} {unpricedCount === 1 ? 'item has' : 'items have'} no amount — counted,
                      not added up.
                    </p>
                  )}

                  {businessTotal > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Personal</p>
                        <p className="font-medium">${personalTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Business</p>
                        <p className="font-medium">${businessTotal.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                    {sections.map(([cat, catRows]) => (
                      <div key={cat} className="flex items-center gap-2 text-sm">
                        <span>{getCategoryIcon(cat)}</span>
                        <span className="text-muted-foreground flex-1 truncate">{getCategoryLabel(cat)}</span>
                        <span className="font-medium">
                          ${catRows.reduce((s, r) => s + (r.amount ?? 0), 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grouped list */}
              <div className="space-y-4">
                {sections.map(([cat, catRows]) => {
                  const isCollapsed = !!collapsed[cat];
                  return (
                    <section key={cat}>
                      <button
                        onClick={() => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                        className="w-full flex items-center gap-2 py-2 text-left"
                        aria-expanded={!isCollapsed}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span>{getCategoryIcon(cat)}</span>
                        <h2 className="text-sm font-medium">{getCategoryLabel(cat)}</h2>
                        <span className="text-sm text-muted-foreground">({catRows.length})</span>
                      </button>

                      {!isCollapsed && (
                        <div className="space-y-3">
                          {catRows.map((row, index) => (
                            <motion.div
                              key={row.key}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="bg-card rounded-xl border border-border p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">
                                  {getCategoryIcon(row.categories[0])}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium truncate flex items-center gap-1.5">
                                    <SourceIcon source={row.source} />
                                    {row.name}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <div className="flex flex-wrap gap-1">
                                      {row.categories.map((catId) => (
                                        <span
                                          key={catId}
                                          className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-xs"
                                        >
                                          {getCategoryIcon(catId)} {getCategoryLabel(catId)}
                                        </span>
                                      ))}
                                    </div>
                                    {row.amount !== undefined && (
                                      <span className="font-medium text-foreground">
                                        ${row.amount.toLocaleString()}
                                      </span>
                                    )}
                                    {row.businessName && <span>{row.businessName}</span>}
                                    {row.attachmentName && (
                                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                                        <Paperclip className="w-3 h-3" />
                                        {row.attachmentName.length > 15
                                          ? row.attachmentName.substring(0, 12) + '...'
                                          : row.attachmentName}
                                      </span>
                                    )}
                                    {row.carriedFromYear && (
                                      <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-xs">
                                        Carried from {row.carriedFromYear}
                                      </span>
                                    )}
                                  </div>
                                  {row.notes && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{row.notes}</p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                                    <button
                                      onClick={() => setAccessTarget({ id: row.itemId, title: row.name })}
                                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                    >
                                      <Users className="w-3.5 h-3.5" /> Who can see this
                                    </button>
                                    {row.source === 'tax' && row.taxDoc && (
                                      <button
                                        onClick={() => setLinkingTaxDoc(row.taxDoc!)}
                                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                      >
                                        <Link2 className="w-3.5 h-3.5" /> What is this about?
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {row.source === 'tax' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(row.itemId)}
                                    className="text-destructive hover:bg-destructive/10"
                                    aria-label="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFromTax(row)}
                                    className="text-muted-foreground hover:text-foreground shrink-0"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Remove from tax</span>
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}

                {rows.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Nothing here for {yearFilter} yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery || categoryFilter !== 'all' || businessFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : "Add a receipt here, or tick “Relevant for tax?” on a bill or document."}
                    </p>
                    <Button onClick={() => setIsAddingDocument(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Document
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search this year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select value={String(yearFilter)} onValueChange={(v) => setYearFilter(parseInt(v))}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TaxCategory | 'all')}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Business filter — only worth showing once there's more than one */}
          {businessNames.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {['all', ...businessNames].map((name) => (
                <button
                  key={name}
                  onClick={() => setBusinessFilter(name)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border transition-colors',
                    businessFilter === name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {name === 'all' ? 'All businesses' : name}
                </button>
              ))}
            </div>
          )}

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
        <TaxSharingPanel />
      </main>

      {/* FAB */}
      {rows.length > 0 && (
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
          <AddTaxDocumentModal onClose={() => setIsAddingDocument(false)} onSave={loadDocuments} />
        )}
      </AnimatePresence>

      {/* Per-row access */}
      <AnimatePresence>
        {accessTarget && (
          <TaxAccessSheet
            itemId={accessTarget.id}
            title={accessTarget.title}
            onClose={() => setAccessTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Linking a direct tax entry to a bill or document */}
      <AnimatePresence>
        {linkingTaxDoc && (
          <LinkTaxItemsSheet taxDocument={linkingTaxDoc} onClose={() => setLinkingTaxDoc(null)} />
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
            onCategoriesChanged={() => setCategoriesVersion((v) => v + 1)}
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

  const handleSave = async () => {
    if (!name.trim() || selectedCategories.length === 0) return;

    await TaxDocumentService.createDocument({
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
