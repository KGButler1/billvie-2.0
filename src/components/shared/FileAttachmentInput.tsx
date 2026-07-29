import { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileAttachment as FileAttachmentType } from '@/types/sharing';
import { cn } from '@/lib/utils';

interface FileAttachmentProps {
  attachment?: FileAttachmentType;
  onAttach: (attachment: FileAttachmentType) => void;
  onRemove: () => void;
  maxSizeMB?: number;
}

const MAX_FILE_SIZE_DEFAULT = 2 * 1024 * 1024; // 2MB

export const FileAttachmentInput = ({ 
  attachment, 
  onAttach, 
  onRemove,
  maxSizeMB = 0.5 
}: FileAttachmentProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSize = maxSizeMB * 1024 * 1024;
  const maxLabel = maxSizeMB < 1 ? `${Math.round(maxSizeMB * 1024)}KB` : `${maxSizeMB}MB`;

  const handleFile = async (file: File) => {
    setError('');

    if (file.size > maxSize) {
      setError(`File too large. Maximum size is ${maxLabel}.`);
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF and image files are allowed.');
      return;
    }

    try {
      const dataUrl = await fileToBase64(file);
      onAttach({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      });
    } catch {
      setError('Failed to read file. Please try again.');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (type === 'application/pdf') return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  if (attachment) {
    return (
      <div className="border border-border rounded-lg p-3">
        <div className="flex items-center gap-3">
          {attachment.type.startsWith('image/') ? (
            <img 
              src={attachment.dataUrl} 
              alt={attachment.name}
              className="w-12 h-12 object-cover rounded-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
              {getFileIcon(attachment.type)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-sm">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = attachment.dataUrl;
                link.download = attachment.name;
                link.click();
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Drop file here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, JPG, PNG up to {maxLabel}
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleInputChange}
        className="hidden"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

// Display-only component for document cards
interface AttachmentBadgeProps {
  attachment: FileAttachmentType;
  onClick?: () => void;
}

export const AttachmentBadge = ({ attachment, onClick }: AttachmentBadgeProps) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full hover:bg-muted/80 transition-colors"
    >
      <File className="w-3 h-3" />
      <span className="truncate max-w-[80px]">{attachment.name}</span>
    </button>
  );
};
