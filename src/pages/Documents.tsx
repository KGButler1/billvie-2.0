import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentService } from '@/services/DocumentService';
import { AccessService } from '@/services/AccessService';
import { HouseholdDocument } from '@/types/document';
import DocumentCard from '@/components/documents/DocumentCard';
import AddDocumentModal from '@/components/documents/AddDocumentModal';
import AttachDocumentSheet from '@/components/documents/AttachDocumentSheet';
import AccessSheet from '@/components/documents/AccessSheet';
import LinkItemsSheet from '@/components/documents/LinkItemsSheet';

import BottomNav from '@/components/BottomNav';

const Documents = () => {
  const [documents, setDocuments] = useState<HouseholdDocument[]>(() => DocumentService.getAll());
  const [searchParams] = useSearchParams();
  const [isAdding, setIsAdding] = useState(() => searchParams.get('add') === '1');
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [accessId, setAccessId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);


  const reload = () => setDocuments(DocumentService.getAll());

  const handleAdd = (
    doc: Omit<HouseholdDocument, 'id' | 'createdAt' | 'updatedAt'>,
    personIds: string[]
  ) => {
    const created = DocumentService.add(doc);
    personIds.forEach((pid) => AccessService.grantItem(pid, 'documents', created.id));
    reload();
    setIsAdding(false);
    setAttachingId(created.id);
  };

  const handleEditSave = (id: string, updates: Partial<HouseholdDocument>) => {
    DocumentService.update(id, updates);
    reload();
    setEditingId(null);
  };

  const attachingDoc = attachingId ? documents.find((d) => d.id === attachingId) : undefined;
  const linkingDoc = linkingId ? documents.find((d) => d.id === linkingId) : undefined;
  const editingDoc = editingId ? documents.find((d) => d.id === editingId) : undefined;


  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Important Documents</h1>
          <Button size="sm" onClick={() => setIsAdding(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Trust signal */}
        <p className="text-xs text-muted-foreground text-center mb-6 flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3" />
          No sensitive credentials stored — only you and people you invite can see this
        </p>

        {documents.length === 0 ? (
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
            <Button onClick={() => setIsAdding(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add something important
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <DocumentCard
                  document={doc}
                  onAttach={(id) => setAttachingId(id)}
                  onEditAccess={(id) => setAccessId(id)}
                  onLinks={(id) => setLinkingId(id)}
                  onEdit={(id) => setEditingId(id)}
                  onDelete={(id) => {
                    if (!confirm('Delete this document? You can restore it from Recently Deleted within 30 days.')) return;
                    DocumentService.delete(id);
                    reload();
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {(isAdding || editingDoc) && (
          <AddDocumentModal
            document={editingDoc}
            onAdd={handleAdd}
            onEdit={handleEditSave}
            onClose={() => { setIsAdding(false); setEditingId(null); }}
          />
        )}
        {attachingDoc && (
          <AttachDocumentSheet
            document={attachingDoc}
            onClose={() => { setAttachingId(null); reload(); }}
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


      <BottomNav />
    </div>
  );
};

export default Documents;
