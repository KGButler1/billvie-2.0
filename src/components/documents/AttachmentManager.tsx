import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, FileText, Loader as Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AttachmentService, DocumentAttachment, AttachmentOwnerType } from '@/services/AttachmentService';
import { getHouseholdId } from '@/services/supabaseData';
import DocumentViewerModal from './DocumentViewerModal';

const MAX_ATTACHMENTS = 6;

interface AttachmentManagerProps {
  ownerType: AttachmentOwnerType;
  ownerId: string;
  onChange?: () => void;
}

const AttachmentManager = ({ ownerType, ownerId, onChange }: AttachmentManagerProps) => {
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = useCallback(async () => {
    const atts = await AttachmentService.getForOwner(ownerType, ownerId);
    setAttachments(atts);

    // Load thumbnails for each attachment
    const thumbMap: Record<string, string | null> = {};
    await Promise.all(
      atts.map(async (att) => {
        if (att.thumbnailPath) {
          const url = await AttachmentService.getSignedUrl(att.thumbnailPath);
          thumbMap[att.id] = url;
        } else if (att.mimeType.startsWith('image/')) {
          const url = await AttachmentService.getSignedUrl(att.storagePath);
          thumbMap[att.id] = url;
        } else {
          thumbMap[att.id] = null;
        }
      })
    );
    setThumbnails(thumbMap);
  }, [ownerType, ownerId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (attachments.length + fileArray.length > MAX_ATTACHMENTS) {
      setUploadError(`Maximum ${MAX_ATTACHMENTS} attachments per item.`);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    let householdId: string;
    try {
      householdId = await getHouseholdId();
    } catch {
      setUploadError('Could not determine your household.');
      setIsUploading(false);
      return;
    }

    for (const file of fileArray) {
      const validationError = AttachmentService.validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        continue;
      }
      await AttachmentService.upload(ownerType, ownerId, householdId, file);
    }

    setIsUploading(false);
    await loadAttachments();
    onChange?.();
  };

  const handleRemove = async (attachmentId: string) => {
    await AttachmentService.remove(attachmentId);
    await loadAttachments();
    onChange?.();
  };

  const hasAttachments = attachments.length > 0;
  const atLimit = attachments.length >= MAX_ATTACHMENTS;

  return (
    <div className="space-y-3">
      {hasAttachments && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, index) => (
            <div
              key={att.id}
              className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted group cursor-pointer"
              onClick={() => setViewerIndex(index)}
            >
              {thumbnails[att.id] ? (
                <img src={thumbnails[att.id]!} alt={att.fileName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(att.id); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!atLimit && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-1.5"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {hasAttachments ? 'Add more files' : 'Add files'}
          </Button>
        </>
      )}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

      <p className="text-xs text-muted-foreground">
        PDF or image, up to 10MB. {attachments.length}/{MAX_ATTACHMENTS} attached.
      </p>

      {viewerIndex !== null && (
        <DocumentViewerModal
          attachments={attachments}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onRemoved={loadAttachments}
        />
      )}
    </div>
  );
};

export default AttachmentManager;
