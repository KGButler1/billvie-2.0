import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Link2, MapPin, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileAttachmentInput } from '@/components/shared/FileAttachmentInput';
import { DocumentService } from '@/services/DocumentService';
import { HouseholdDocument } from '@/types/document';
import { FileAttachment } from '@/types/sharing';

type Mode = 'choose' | 'upload' | 'link' | 'location';

interface AttachDocumentSheetProps {
  document: HouseholdDocument;
  onClose: () => void;
}

const options: { mode: Mode; icon: React.ElementType; title: string; description: string }[] = [
  { mode: 'upload', icon: Upload, title: 'Upload a copy', description: 'A PDF or photo, stored privately' },
  { mode: 'link', icon: Link2, title: 'Link to it', description: 'Provider portal, Drive, or Dropbox' },
  { mode: 'location', icon: MapPin, title: 'Just say where it is', description: 'For anything that only exists on paper' },
];

const AttachDocumentSheet = ({ document: doc, onClose }: AttachDocumentSheetProps) => {
  const [mode, setMode] = useState<Mode>('choose');
  const [attachment, setAttachment] = useState<FileAttachment | undefined>(doc.attachment);
  const [link, setLink] = useState(doc.externalLink ?? '');
  const [location, setLocation] = useState(doc.physicalLocation ?? '');
  const [linkError, setLinkError] = useState('');
  const [storageFull, setStorageFull] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && window.document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && window.document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.document.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    return () => window.document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const persist = (updates: Partial<HouseholdDocument>) => {
    try {
      DocumentService.update(doc.id, updates);
      onClose();
    } catch (e) {
      if (e instanceof Error && e.message === 'STORAGE_FULL') {
        setStorageFull(true);
        setAttachment(undefined);
        setMode('choose');
      } else {
        throw e;
      }
    }
  };

  const handleSave = () => {
    if (mode === 'upload') {
      persist({ attachment });
    } else if (mode === 'link') {
      const value = link.trim();
      if (!/^https?:\/\//i.test(value)) {
        setLinkError("That doesn't look like a web address");
        return;
      }
      persist({ externalLink: value });
    } else if (mode === 'location') {
      persist({ physicalLocation: location.trim() || undefined });
    }
  };

  const saveDisabled =
    (mode === 'upload' && !attachment) ||
    (mode === 'link' && !/^https?:\/\//i.test(link.trim())) ||
    (mode === 'location' && !location.trim());

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
        aria-label="Where is the actual document?"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5 gap-3">
          <div className="flex items-start gap-2 min-w-0">
            {mode !== 'choose' && (
              <button
                onClick={() => setMode('choose')}
                aria-label="Back"
                className="p-1 -ml-1 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Where is the actual document?</h2>
              <p className="text-sm text-muted-foreground">
                Optional — the record above already helps. This makes it easier to find.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-muted rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {storageFull && (
          <div className="mb-4 rounded-xl border border-border bg-muted/50 p-4">
            <p className="text-sm font-medium">There isn't room for another file right now</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your record is saved and safe. For this one, try a link or a note about where the original is kept
              instead.
            </p>
          </div>
        )}

        {mode === 'choose' ? (
          <div className="space-y-3">
            {options
              .filter((o) => !(storageFull && o.mode === 'upload'))
              .map((o) => (
                <button
                  key={o.mode}
                  onClick={() => setMode(o.mode)}
                  className="w-full text-left flex items-start gap-3 rounded-xl border border-border p-4 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <o.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{o.title}</p>
                    <p className="text-xs text-muted-foreground">{o.description}</p>
                  </div>
                </button>
              ))}
            <div className="pt-1 text-center">
              <button
                onClick={onClose}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Skip for now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {mode === 'upload' && (
              <div className="space-y-2">
                <FileAttachmentInput
                  attachment={attachment}
                  maxSizeMB={0.5}
                  onAttach={setAttachment}
                  onRemove={() => setAttachment(undefined)}
                />
                <p className="text-xs text-muted-foreground">
                  PDF or image, up to 500KB. Stored privately — only you and people you share with can open it.
                </p>
              </div>
            )}

            {mode === 'link' && (
              <div className="space-y-2">
                <label htmlFor="doc-link" className="text-sm font-medium block">
                  Where can it be found online?
                </label>
                <Input
                  id="doc-link"
                  value={link}
                  placeholder="https://..."
                  onChange={(e) => {
                    setLink(e.target.value);
                    setLinkError('');
                  }}
                />
                {linkError && <p className="text-xs text-destructive">{linkError}</p>}
                <p className="text-xs text-muted-foreground">We only store the link, never your login.</p>
              </div>
            )}

            {mode === 'location' && (
              <div className="space-y-2">
                <label htmlFor="doc-location" className="text-sm font-medium block">
                  Where is the original kept?
                </label>
                <Input
                  id="doc-location"
                  value={location}
                  placeholder="e.g. Fireproof box in the study, top shelf"
                  onChange={(e) => setLocation(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The kind of thing someone would have no way of guessing.
                </p>
              </div>
            )}

            <Button className="w-full" onClick={handleSave} disabled={saveDisabled}>
              Save
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AttachDocumentSheet;
