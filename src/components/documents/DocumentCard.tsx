import { useState, useEffect } from 'react';
import { Shield, TrendingUp, Building, Landmark, FileText, File, Trash2, Paperclip, Link2, MapPin, CalendarClock, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { HouseholdDocument, DocumentType } from '@/types/document';
import { AccessService } from '@/services/AccessService';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { BillService } from '@/services/BillService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { PersonTagChips } from '@/components/people/PersonTags';
import { AttachmentService, DocumentAttachment } from '@/services/AttachmentService';
import DocumentViewerModal from './DocumentViewerModal';

const typeIcons: Record<DocumentType, React.ElementType> = {
  insurance: Shield,
  investment: TrendingUp,
  account: Building,
  superannuation: Landmark,
  will: FileText,
  other: File,
};

const firstName = (name: string) => name.trim().split(' ')[0] || name;

const joinNames = (names: string[]) => {
  if (names.length === 1) return names[0];
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} others`;
};

interface DocumentCardProps {
  document: HouseholdDocument;
  onDelete: (id: string) => void;
  onEditAccess: (id: string) => void;
  onLinks: (id: string) => void;
  onEdit: (id: string) => void;
}

const DocumentCard = ({ document, onDelete, onEditAccess, onLinks, onEdit }: DocumentCardProps) => {
  const Icon = typeIcons[document.type] || File;
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const atts = await AttachmentService.getForOwner('document', document.id);
      if (!active) return;
      setAttachments(atts);
      if (atts.length > 0) {
        const first = atts[0];
        if (first.thumbnailPath) {
          const url = await AttachmentService.getSignedUrl(first.thumbnailPath);
          if (active) setThumbnailUrl(url);
        } else if (first.mimeType.startsWith('image/')) {
          const url = await AttachmentService.getSignedUrl(first.storagePath);
          if (active) setThumbnailUrl(url);
        }
      }
    })();
    return () => { active = false; };
  }, [document.id]);

  const hasAttachment = attachments.length > 0 || !!document.externalLink || !!document.physicalLocation;
  const viewers = AccessService.getPeopleFor('documents', document.id).map((p) => firstName(p.name));
  const linkedBillId = DocumentLinkService.getLinkedBillId(document.id);
  const linkedBill = linkedBillId ? BillService.getBillById(linkedBillId) : undefined;
  const relatedCount = DocumentLinkService.getRelatedDocumentIds(document.id).length;

  const linkedFinancialLabel = (() => {
    const ins = FinancialInfoService.getInsurance().find((e) => e.linkedDocumentId === document.id);
    if (ins) return ins.provider;
    const sup = FinancialInfoService.getSuperannuation().find((e) => e.linkedDocumentId === document.id);
    if (sup) return sup.fundName;
    return undefined;
  })();

  return (
    <div
      onClick={() => onEdit(document.id)}
      className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
          <Icon className="w-5 h-5 text-primary" />
          {attachments.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
              <Paperclip className="w-2 h-2 text-primary-foreground" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate">{document.title}</h3>
            {document.provider && (
              <p className="text-xs text-muted-foreground truncate">{document.provider}</p>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onEditAccess(document.id); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 block text-left"
            >
              {viewers.length > 0 ? `Visible to ${joinNames(viewers)}` : 'Only you can see this'}
            </button>

            <div className="mt-1 space-y-0.5">
              {attachments.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setViewerIndex(0); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 min-w-0"
                >
                  <Paperclip className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{attachments.length} file{attachments.length === 1 ? '' : 's'} attached</span>
                </button>
              )}
              {document.externalLink && (
                <a
                  href={document.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 min-w-0"
                >
                  <Link2 className="w-3 h-3 flex-shrink-0" /> Opens at provider
                </a>
              )}
              {document.physicalLocation && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{document.physicalLocation}</span>
                </p>
              )}
              {!hasAttachment && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(document.id); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Add the document itself
                </button>
              )}
            </div>
          </div>

          <PersonTagChips personIds={document.taggedPersonIds} className="mt-2" />

          {document.importantDate && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 min-w-0">
              <CalendarClock className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {(document.importantDateLabel || 'Important date') + ': '}
                {format(parseISO(document.importantDate), 'MMM d, yyyy')}
              </span>
            </p>
          )}

          {linkedBill && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 min-w-0">
              <Link2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">Linked to {linkedBill.name}</span>
            </p>
          )}

          {linkedFinancialLabel && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 min-w-0">
              <Link2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">Linked to Financial Snapshot: {linkedFinancialLabel}</span>
            </p>
          )}

          {relatedCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 min-w-0">
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                Related to {relatedCount} other document{relatedCount === 1 ? '' : 's'}
              </span>
            </p>
          )}

          {document.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{document.notes}</p>
          )}

          <div className="flex items-center gap-3 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(document.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={() => onLinks(document.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Link2 className="w-3 h-3" /> Link to a bill or document
            </button>
            <button
              onClick={() => onDelete(document.id)}
              className="text-xs text-destructive/70 hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>

        {thumbnailUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); setViewerIndex(0); }}
            className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-border shadow-sm overflow-hidden bg-muted hover:shadow-md hover:border-primary/40 transition-all"
            aria-label="View attached file"
          >
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </button>
        )}
      </div>

      {viewerIndex !== null && (
        <DocumentViewerModal
          attachments={attachments}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};

export default DocumentCard;
