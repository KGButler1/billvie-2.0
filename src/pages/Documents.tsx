import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Shield, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SkeletonRows } from '@/components/ui/skeleton';
import { DocumentService } from '@/services/DocumentService';
import { MilestoneService } from '@/services/MilestoneService';
import { showMilestoneToast } from '@/components/MilestoneToast';
import { AccessService } from '@/services/AccessService';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { TaxTagService } from '@/services/TaxTagService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { TaxRelevanceValue } from '@/components/tax/TaxRelevanceFields';
import { HouseholdDocument } from '@/types/document';
import DocumentCard from '@/components/documents/DocumentCard';
import AddDocumentModal from '@/components/documents/AddDocumentModal';
import AccessSheet from '@/components/documents/AccessSheet';
import LinkItemsSheet from '@/components/documents/LinkItemsSheet';
import DismissibleIntro from '@/components/DismissibleIntro';
import BottomNav from '@/components/BottomNav';
import Fab from '@/components/Fab';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { UserService } from '@/services/UserService';
import { isDemoModeActive } from '@/demo/demoFlag';
import { useProfile } from '@/hooks/useProfile';
import UpgradeModal from '@/components/UpgradeModal';
import { canAddDocument } from '@/utils/documentLimits';
import { FREE_DOCUMENT_LIMIT } from '@/constants/pricing';
import UsageCounter from '@/components/shared/UsageCounter';
import EditOnly from '@/components/EditOnly';
import { useViewerAccess } from '@/hooks/useViewerAccess';
import { useAccessRedirect } from '@/hooks/useAccessRedirect';
import { ItemFlagService } from '@/services/ItemFlagService';
import { toast } from 'sonner';
import { PeopleService } from '@/services/PeopleService';
import { FlaggedInitialsStack } from '@/components/people/PersonTags';
import { X } from 'lucide-react';

type DocType = HouseholdDocument['type'];
type SortKey = 'updated' | 'title' | 'type';

const TYPE_LABELS: Record<string, string> = {
  insurance: 'Insurance',
  investment: 'Investments',
  account: 'Accounts',
  superannuation: 'Super & Retirement',
  will: 'Wills & Estate',
  other: 'Other',
};

const TYPE_ORDER: DocType[] = ['insurance', 'investment', 'account', 'superannuation', 'will', 'other'];

const SORT_LABELS: Record<SortKey, string> = {
  updated: 'Recently updated',
  title: 'Title (A–Z)',
  type: 'Category',
};

const Documents = () => {
  const { profile } = useProfile();
  const isPaid = profile?.isPaid ?? false;
  const { isAdmin } = useViewerAccess();
  const { accessLoading } = useAccessRedirect('documents');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [documents, setDocuments] = useState<HouseholdDocument[]>(() => DocumentService.getAll());
  const [scannedDocs, setScannedDocs] = useState<HouseholdDocument[]>(() => DocumentService.getScanned());
  const [searchParams] = useSearchParams();
  const [isAdding, setIsAdding] = useState(() => searchParams.get('add') === '1');
  const [accessId, setAccessId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [demoNudge, setDemoNudge] = useState(false);
  const [typeFilter, setTypeFilter] = useState<DocType | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [forYouFilter, setForYouFilter] = useState(false);
  const [forPersonFilter, setForPersonFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !DocumentService.isLoaded());
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState<string | null>(null);

  useEffect(() => {
    DocumentService.refresh().then(reload).catch(console.error).finally(() => setIsLoading(false));
    ItemFlagService.refresh().catch(console.error);
  }, []);

  useEffect(() => {
    const forParam = searchParams.get('for');
    if (forParam) setForPersonFilter(forParam);
  }, [searchParams]);

  const reload = () => {
    setDocuments(DocumentService.getAll());
    setScannedDocs(DocumentService.getScanned());
  };

  const handleAdd = async (
    doc: Omit<HouseholdDocument, 'id' | 'createdAt' | 'updatedAt'>,
    personIds: string[],
    linkedBillId?: string,
    tax?: TaxRelevanceValue,
    linkedFinancialEntry?: { type: 'insurance' | 'super'; id: string },
    flaggedPersonIds?: string[]
  ) => {
    const created = await DocumentService.add(doc);
    await Promise.all(personIds.map((pid) => AccessService.grantItem(pid, 'documents', created.id)));
    if (linkedBillId) await DocumentLinkService.linkToBill(created.id, linkedBillId);
    if (tax) await TaxTagService.setTag(created.id, 'document', tax);
    if (flaggedPersonIds && flaggedPersonIds.length > 0) {
      try {
        await ItemFlagService.setFlags('document', created.id, flaggedPersonIds);
      } catch (e) {
        console.error('Failed to save flags:', e);
        toast.error("Couldn't save who this is for — everything else was saved");
      }
    }
    if (linkedFinancialEntry) {
      if (linkedFinancialEntry.type === 'insurance') {
        await FinancialInfoService.updateInsurance(linkedFinancialEntry.id, { linkedDocumentId: created.id });
      } else {
        await FinancialInfoService.updateSuperannuation(linkedFinancialEntry.id, { linkedDocumentId: created.id });
      }
    }
    const msg = MilestoneService.recordMilestone('documents');
    if (msg) showMilestoneToast(msg);
    reload();
    setIsAdding(false);
    // Open the edit dialog scrolled to the where-to-find-it section, preserving the post-save prompt behavior.
    setEditingId(created.id);
    if (isDemoModeActive()) {
      setDemoNudge(true);
      setTimeout(() => setDemoNudge(false), 4000);
    }
  };

  const handleEditSave = async (id: string, updates: Partial<HouseholdDocument>, tax?: TaxRelevanceValue, flaggedPersonIds?: string[]) => {
    await DocumentService.update(id, updates);
    if (tax) await TaxTagService.setTag(id, 'document', tax);
    if (flaggedPersonIds) {
      try {
        await ItemFlagService.setFlags('document', id, flaggedPersonIds);
      } catch (e) {
        console.error('Failed to save flags:', e);
        toast.error("Couldn't save who this is for — everything else was saved");
      }
    }
    reload();
    setEditingId(null);
    if (isDemoModeActive()) {
      setDemoNudge(true);
      setTimeout(() => setDemoNudge(false), 4000);
    }
  };

  const linkingDoc = linkingId ? [...documents, ...scannedDocs].find((d) => d.id === linkingId) : undefined;
  const editingDoc = editingId ? [...documents, ...scannedDocs].find((d) => d.id === editingId) : undefined;

  const handleTryAddDocument = () => {
    if (canAddDocument(isPaid)) setIsAdding(true);
    else setShowUpgradeModal(true);
  };

  // Important documents: filtered + sorted, grouped by type
  const filteredDocs = useMemo(() => {
    let list = documents;
    if (forYouFilter) {
      if (profile?.personId) {
        const me = PeopleService.getById(profile.personId);
        if (me) {
          const flaggedIds = ItemFlagService.getFlagsForPersonByType(me.id, 'document').map((f) => f.itemId);
          list = list.filter((d) => flaggedIds.includes(d.id));
        }
      }
    }
    if (forPersonFilter) {
      const flaggedIds = ItemFlagService.getFlagsForPersonByType(forPersonFilter, 'document').map((f) => f.itemId);
      list = list.filter((d) => flaggedIds.includes(d.id));
    }
    if (typeFilter !== 'all') list = list.filter((d) => d.type === typeFilter);

    const sorted = [...list].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'type') return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return sorted;
  }, [documents, typeFilter, sort]);

  const groupedDocs = useMemo(() => {
    const groups: Record<string, HouseholdDocument[]> = {};
    for (const doc of filteredDocs) {
      if (!groups[doc.type]) groups[doc.type] = [];
      groups[doc.type].push(doc);
    }
    return groups;
  }, [filteredDocs]);

  // Scanned documents: flat, newest first
  const sortedScanned = useMemo(
    () => [...scannedDocs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [scannedDocs]
  );

  const availableTypes = useMemo(() => {
    const types = new Set(documents.map((d) => d.type));
    return TYPE_ORDER.filter((t) => types.has(t));
  }, [documents]);

  const forYouCount = useMemo(() => {
    if (!profile?.personId) return 0;
    const me = PeopleService.getById(profile.personId);
    if (!me) return 0;
    return ItemFlagService.getFlagsForPersonByType(me.id, 'document')
      .filter((f) => documents.some((d) => d.id === f.itemId))
      .length;
  }, [documents, profile?.personId]);

  const forPersonName = useMemo(() => {
    if (!forPersonFilter) return null;
    const p = PeopleService.getById(forPersonFilter);
    return p?.name ?? null;
  }, [forPersonFilter]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Important Documents</h1>
          <EditOnly>
          <Button size="sm" onClick={handleTryAddDocument} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </Button>
          </EditOnly>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 lg:pt-8 max-w-4xl">
        {accessLoading ? (
          <SkeletonRows rows={4} />
        ) : (
        <>
        {demoNudge && (
          <p className="text-sm text-muted-foreground italic mb-4">
            This is what a note looks like for your own family. Nothing fancy, just clear.
          </p>
        )}

        {/* Trust signal */}
        <p className="text-xs text-muted-foreground text-center mb-6 flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3" />
          No sensitive credentials stored — only you and people you invite can see this
        </p>

        {documents.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-semibold hidden lg:block">Important Documents</h1>
              <EditOnly>
              <Button onClick={handleTryAddDocument} className="gap-1.5">
                <Plus className="w-4 h-4" /> Add
              </Button>
              </EditOnly>
            </div>
            <UsageCounter
              count={DocumentService.getCount()}
              limit={isPaid ? Infinity : FREE_DOCUMENT_LIMIT}
              label="documents"
            />
          </>
        )}

        {documents.length === 0 && scannedDocs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Start with one thing your family shouldn't have to search for</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add important documents so they're easy to find when needed — insurance, super, accounts and investments, or anything your household depends on.
            </p>
            <EditOnly>
            <Button onClick={handleTryAddDocument} className="gap-2">
              <Plus className="w-4 h-4" /> Add something important
            </Button>
            </EditOnly>
          </motion.div>
        ) : (
          <>
            {/* Intro blurb */}
            <DismissibleIntro storageKey="billvie_documents_intro">
              This is the important stuff — a will, a policy, anything someone would need to find in a hurry.
              Scanned bills show up further down for convenience; they don't need to be filed here on purpose.
            </DismissibleIntro>

            {/* Important Documents section */}
            {documents.length > 0 && (
              <div className="mb-8">
                {/* Toolbar (visible even while loading) */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setTypeFilter('all')}
                      className={cn(
                        'text-sm px-3 py-1.5 rounded-full border transition-colors',
                        typeFilter === 'all'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      All
                    </button>
                    {availableTypes.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={cn(
                          'text-sm px-3 py-1.5 rounded-full border transition-colors',
                          typeFilter === t
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        {TYPE_LABELS[t] || t}
                      </button>
                    ))}
                    {forYouCount > 0 && (
                      <button
                        onClick={() => setForYouFilter(!forYouFilter)}
                        className={cn(
                          'text-sm px-3 py-1.5 rounded-full border transition-colors',
                          forYouFilter
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        For you ({forYouCount})
                      </button>
                    )}
                    {forPersonName && (
                      <span className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border border-primary bg-primary/5 text-primary">
                        For {forPersonName}
                        <button
                          onClick={() => {
                            setForPersonFilter(null);
                            const url = new URL(window.location.href);
                            url.searchParams.delete('for');
                            window.history.replaceState(null, '', url);
                          }}
                          className="p-0.5 rounded-full hover:bg-primary/10"
                          aria-label="Clear filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                      <SelectTrigger className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {Object.entries(SORT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Grouped documents */}
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div key="skeleton" exit={{ opacity: 0 }}>
                      <SkeletonRows rows={4} />
                    </motion.div>
                  ) : (
                    <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      {TYPE_ORDER.filter((t) => groupedDocs[t]?.length).map((type) => (
                        <div key={type}>
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            {TYPE_LABELS[type] || type}
                          </h3>
                          <div className="space-y-3">
                            {groupedDocs[type].map((doc, i) => (
                              <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                              >
                                <DocumentCard
                                  document={doc}
                                  onEditAccess={isAdmin ? (id) => setAccessId(id) : undefined}
                                  onLinks={(id) => setLinkingId(id)}
                                  onEdit={(id) => {
                                    setEditingId(id);
                                  }}
                                  onDelete={async (id) => {
                                    if (!UserService.shouldWarnBeforeDelete('document')) {
                                      await DocumentService.delete(id);
                                      reload();
                                      return;
                                    }
                                    setPendingDeleteDocument(id);
                                  }}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Scanned Documents section */}
            {sortedScanned.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ScanLine className="w-3.5 h-3.5" />
                  Scanned Bills
                </h2>
                <div className="space-y-2">
                  {sortedScanned.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onEditAccess={isAdmin ? (id) => setAccessId(id) : undefined}
                      onLinks={(id) => setLinkingId(id)}
                      onEdit={(id) => {
                        setEditingId(id);
                      }}
                      onDelete={async (id) => {
                        if (!UserService.shouldWarnBeforeDelete('document')) {
                          await DocumentService.delete(id);
                          reload();
                          return;
                        }
                        setPendingDeleteDocument(id);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        </>
        )}
      </main>

      <AnimatePresence>
        {(isAdding || editingDoc) && (
          <AddDocumentModal
            document={editingDoc}
            onAdd={handleAdd}
            onEdit={handleEditSave}
            onClose={() => {
              setIsAdding(false);
              setEditingId(null);
            }}
          />
        )}
        {accessId && (
          <AccessSheet
            scope="documents"
            itemId={accessId}
            onClose={() => { setAccessId(null); reload(); }}
          />
        )}
        {linkingDoc && (
          <LinkItemsSheet
            document={linkingDoc}
            onClose={() => { setLinkingId(null); reload(); }}
          />
        )}
      </AnimatePresence>

      <ConfirmDeleteDialog
        open={!!pendingDeleteDocument}
        onOpenChange={(o) => { if (!o) setPendingDeleteDocument(null); }}
        warnKey="document"
        title="Delete this document?"
        onConfirm={async () => {
          if (pendingDeleteDocument) {
            await DocumentService.delete(pendingDeleteDocument);
            reload();
          }
          setPendingDeleteDocument(null);
        }}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="documents"
      />

      <EditOnly>
      <Fab onClick={handleTryAddDocument} />
      </EditOnly>

      <BottomNav />
    </div>
  );
};

export default Documents;
