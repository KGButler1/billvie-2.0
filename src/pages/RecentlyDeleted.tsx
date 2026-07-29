import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, Trash2, Receipt, CalendarDays, FolderOpen, FileSpreadsheet, Clock } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { DocumentService } from '@/services/DocumentService';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import BottomNav from '@/components/BottomNav';

interface DeletedRow {
  id: string;
  name: string;
  deletedAt?: string;
  restore: () => void;
  purge: () => void;
}

const RecentlyDeleted = () => {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const reload = () => setVersion(v => v + 1);

  const sections: { key: string; title: string; icon: React.ElementType; rows: DeletedRow[] }[] = [
    {
      key: 'bills',
      title: 'Bills',
      icon: Receipt,
      rows: BillService.getDeletedBills().map(b => ({
        id: b.id,
        name: b.name,
        deletedAt: b.deletedAt,
        restore: () => BillService.restoreBill(b.id),
        purge: () => BillService.permanentlyDeleteBill(b.id),
      })),
    },
    {
      key: 'events',
      title: 'Events',
      icon: CalendarDays,
      rows: EventService.getDeletedEvents().map(e => ({
        id: e.id,
        name: e.name,
        deletedAt: e.deletedAt,
        restore: () => EventService.restoreEvent(e.id),
        purge: () => EventService.permanentlyDeleteEvent(e.id),
      })),
    },
    {
      key: 'documents',
      title: 'Important Documents',
      icon: FolderOpen,
      rows: DocumentService.getDeleted().map(d => ({
        id: d.id,
        name: d.title,
        deletedAt: d.deletedAt,
        restore: () => DocumentService.restore(d.id),
        purge: () => DocumentService.permanentlyDelete(d.id),
      })),
    },
    {
      key: 'tax',
      title: 'Tax Documents',
      icon: FileSpreadsheet,
      rows: TaxDocumentService.getDeletedDocuments().map(d => ({
        id: d.id,
        name: d.name,
        deletedAt: d.deletedAt,
        restore: () => TaxDocumentService.restoreDocument(d.id),
        purge: () => TaxDocumentService.permanentlyDeleteDocument(d.id),
      })),
    },
  ];

  const visibleSections = sections.filter(s => s.rows.length > 0);
  const totalCount = visibleSections.reduce((sum, s) => sum + s.rows.length, 0);

  const handleRestore = (row: DeletedRow) => {
    row.restore();
    reload();
  };

  const handlePurge = (row: DeletedRow) => {
    if (confirm(`Permanently delete "${row.name}"? This can't be undone.`)) {
      row.purge();
      reload();
    }
  };

  const deletedAgo = (iso?: string) => {
    if (!iso) return 'Recently deleted';
    try {
      return `Deleted ${formatDistanceToNow(parseISO(iso), { addSuffix: true })}`;
    } catch {
      return 'Recently deleted';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24" key={version}>
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Recently Deleted</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 max-w-2xl">
        <h1 className="hidden lg:block text-2xl font-bold mb-2">Recently Deleted</h1>
        <p className="text-sm text-muted-foreground mb-6 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Items are permanently removed after 30 days.
        </p>

        {totalCount === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Undo2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Nothing deleted recently</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Anything you delete lands here first, so a mistake is never permanent straight away.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {visibleSections.map(section => (
              <section key={section.key}>
                <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <section.icon className="w-4 h-4 text-primary" />
                  {section.title} ({section.rows.length})
                </h2>
                <div className="space-y-2">
                  {section.rows.map(row => (
                    <div
                      key={row.id}
                      className="bg-card border border-border rounded-lg p-3 flex items-center gap-3 flex-wrap"
                    >
                      <div className="flex-1 min-w-[140px]">
                        <p className="text-sm font-medium truncate">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{deletedAgo(row.deletedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleRestore(row)} className="gap-1.5">
                          <Undo2 className="w-3.5 h-3.5" /> Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePurge(row)}
                          className="gap-1.5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default RecentlyDeleted;
