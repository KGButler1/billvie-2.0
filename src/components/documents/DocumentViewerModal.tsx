import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ExternalLink, Trash2, FileText, CircleAlert as AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentAttachment, AttachmentService } from '@/services/AttachmentService';
import { getPdfPageCount, renderPdfPage } from '@/utils/pdfThumbnail';

interface DocumentViewerModalProps {
  attachments: DocumentAttachment[];
  initialIndex: number;
  onClose: () => void;
  onRemoved?: () => void;
}

const DocumentViewerModal = ({ attachments, initialIndex, onClose, onRemoved }: DocumentViewerModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfRenderedPages, setPdfRenderedPages] = useState<Set<number>>(new Set());
  const [pdfError, setPdfError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const attachment = attachments[currentIndex];
  const isPdf = attachment?.mimeType === 'application/pdf';
  const isImage = attachment?.mimeType?.startsWith('image/');

  const loadAttachment = useCallback(async () => {
    if (!attachment) return;
    setIsLoading(true);
    setSignedUrl(null);
    setPdfData(null);
    setPdfPageCount(0);
    setPdfRenderedPages(new Set());
    setPdfError(false);

    const url = await AttachmentService.getSignedUrl(attachment.storagePath);
    if (!url) {
      setIsLoading(false);
      return;
    }
    setSignedUrl(url);

    if (isPdf) {
      try {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        setPdfData(buffer);
        const count = await getPdfPageCount(buffer);
        setPdfPageCount(count);
      } catch {
        setPdfError(true);
      }
    }
    setIsLoading(false);
  }, [attachment, isPdf]);

  useEffect(() => {
    loadAttachment();
  }, [loadAttachment]);

  // Lazy PDF page rendering on scroll
  const renderVisiblePages = useCallback(async () => {
    if (!pdfData || pdfPageCount === 0) return;
    const container = scrollRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    for (let i = 0; i < pdfPageCount; i++) {
      const canvas = pageRefs.current[i];
      if (!canvas) continue;
      if (pdfRenderedPages.has(i)) continue;

      const rect = canvas.getBoundingClientRect();
      const isVisible =
        rect.bottom > containerRect.top - 200 && rect.top < containerRect.bottom + 200;
      if (isVisible) {
        const success = await renderPdfPage(pdfData, i + 1, canvas);
        if (success) {
          setPdfRenderedPages((prev) => new Set(prev).add(i));
        }
      }
    }
  }, [pdfData, pdfPageCount, pdfRenderedPages]);

  useEffect(() => {
    if (!pdfData) return;
    // Initial render of visible pages
    setTimeout(renderVisiblePages, 100);
  }, [pdfData, renderVisiblePages]);

  const handleScroll = () => renderVisiblePages();

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      pageRefs.current = [];
    }
  };

  const goNext = () => {
    if (currentIndex < attachments.length - 1) {
      setCurrentIndex(currentIndex + 1);
      pageRefs.current = [];
    }
  };

  const handleRemove = async () => {
    if (!attachment) return;
    await AttachmentService.remove(attachment.id);
    setShowRemoveConfirm(false);
    onRemoved?.();
    if (attachments.length <= 1) {
      onClose();
    } else if (currentIndex >= attachments.length - 1) {
      setCurrentIndex(currentIndex - 1);
      pageRefs.current = [];
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full max-w-4xl max-h-screen flex flex-col"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            {attachments.length > 1 && (
              <Button variant="ghost" size="icon" onClick={goPrev} disabled={currentIndex === 0} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <span className="text-sm font-medium truncate">
              {attachment?.fileName}
              {attachments.length > 1 && ` (${currentIndex + 1} of ${attachments.length})`}
            </span>
            {attachments.length > 1 && (
              <Button variant="ghost" size="icon" onClick={goNext} disabled={currentIndex === attachments.length - 1} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {signedUrl && (
              <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ExternalLink className="w-4 h-4" /> Open original
                </Button>
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRemoveConfirm(true)}
              className="text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Remove
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-muted/30 p-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isImage && signedUrl ? (
            <div className="flex items-center justify-center min-h-full">
              <img
                src={signedUrl}
                alt={attachment.fileName}
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          ) : isPdf ? (
            pdfError ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <AlertCircle className="w-12 h-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Couldn't display this PDF inline. Use "Open original" to view or download it.
                </p>
                {signedUrl && (
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-1.5">
                      <ExternalLink className="w-4 h-4" /> Open original
                    </Button>
                  </a>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 pb-4">
                {Array.from({ length: pdfPageCount }, (_, i) => (
                  <canvas
                    key={i}
                    ref={(el) => { pageRefs.current[i] = el; }}
                    className="max-w-full rounded-lg shadow-lg bg-white"
                    style={{ minHeight: 200 }}
                  />
                ))}
                {pdfPageCount === 0 && !pdfError && (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Preview not available</p>
              {signedUrl && (
                <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-1.5">
                    <ExternalLink className="w-4 h-4" /> Open original
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Remove confirmation */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowRemoveConfirm(false)}>
          <div className="bg-card rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Remove this file?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently remove the file. The document record itself stays.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRemoveConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleRemove}>
                Remove file
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DocumentViewerModal;
