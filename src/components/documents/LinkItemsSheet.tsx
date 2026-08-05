import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Link2, Receipt, FileText } from 'lucide-react';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { DocumentService } from '@/services/DocumentService';
import { BillService } from '@/services/BillService';
import { HouseholdDocument } from '@/types/document';

interface LinkItemsSheetProps {
  document: HouseholdDocument;
  onClose: () => void;
}

const Chip = ({
  icon: Icon,
  label,
  onRemove,
}: {
  icon: React.ElementType;
  label: string;
  onRemove: () => void;
}) => (
  <button
    onClick={onRemove}
    className="inline-flex items-center gap-1.5 max-w-full text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    aria-label={`Remove link to ${label}`}
  >
    <Icon className="w-3 h-3 flex-shrink-0" />
    <span className="truncate">{label}</span>
    <X className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
  </button>
);

const LinkItemsSheet = ({ document: doc, onClose }: LinkItemsSheetProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.document.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    return () => window.document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const linkedBillId = useMemo(() => DocumentLinkService.getLinkedBillId(doc.id), [doc.id, version]);
  const linkedBill = useMemo(
    () => (linkedBillId ? BillService.getBillById(linkedBillId) : undefined),
    [linkedBillId]
  );
  const bills = useMemo(() => BillService.getAllBills(), []);

  const relatedIds = useMemo(
    () => DocumentLinkService.getRelatedDocumentIds(doc.id),
    [doc.id, version]
  );
  const allDocs = useMemo(() => DocumentService.getAll(), [version]);
  const relatedDocs = allDocs.filter((d) => relatedIds.includes(d.id));
  const linkableDocs = allDocs.filter((d) => d.id !== doc.id && !relatedIds.includes(d.id));

  const removeLink = async (targetId: string) => {
    const id = DocumentLinkService.findActiveLinkId(doc.id, targetId);
    if (id) await DocumentLinkService.unlink(id);
    bump();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Link to a bill or document"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5 gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">What else is this part of?</h2>
            <p className="text-sm text-muted-foreground">
              Linking doesn't change who can see anything — it just connects the same real thing.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-muted rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section A — Linked bill */}
        <section className="mb-6">
          <h3 className="text-sm font-medium mb-2">Linked bill</h3>
          {linkedBill ? (
            <Chip icon={Receipt} label={linkedBill.name} onRemove={() => removeLink(linkedBill.id)} />
          ) : bills.length === 0 ? (
            <p className="text-xs text-muted-foreground">No bills yet.</p>
          ) : (
            <Command className="rounded-xl border border-border">
              <CommandInput placeholder="Find a bill…" />
              <CommandList className="max-h-40">
                <CommandGroup>
                  {bills.map((bill) => (
                    <CommandItem
                      key={bill.id}
                      value={bill.name}
                      onSelect={async () => {
                        await DocumentLinkService.linkToBill(doc.id, bill.id);
                        bump();
                      }}
                    >
                      <Receipt className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                      <span className="truncate">{bill.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </section>

        {/* Section B — Related documents */}
        <section>
          <h3 className="text-sm font-medium mb-2">Related documents</h3>
          {relatedDocs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {relatedDocs.map((d) => (
                <Chip key={d.id} icon={FileText} label={d.title} onRemove={() => removeLink(d.id)} />
              ))}
            </div>
          )}
          {linkableDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing else to link to yet.</p>
          ) : (
            <Command className="rounded-xl border border-border">
              <CommandInput placeholder="Find a document…" />
              <CommandList className="max-h-40">
                <CommandGroup>
                  {linkableDocs.map((d) => (
                    <CommandItem
                      key={d.id}
                      value={d.title}
                      onSelect={async () => {
                        await DocumentLinkService.linkToDocument(doc.id, d.id);
                        bump();
                      }}
                    >
                      <Link2 className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                      <span className="truncate">{d.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </section>
      </motion.div>
    </motion.div>
  );
};

export default LinkItemsSheet;
