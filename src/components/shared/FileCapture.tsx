import { useRef, useState, useCallback } from 'react';
import { Camera, Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CapturedFile {
  file: File;
  previewUrl: string;
  id: string;
}

interface FileCaptureProps {
  files: CapturedFile[];
  onFilesChange: (files: CapturedFile[]) => void;
  multiple?: boolean;
  accept?: string;
  className?: string;
}

const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const generateId = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36);

const createPreview = (file: File): string => {
  if (file.type.startsWith('image/')) return URL.createObjectURL(file);
  return '';
};

const FileCapture = ({
  files,
  onFilesChange,
  multiple = true,
  accept = 'image/*,.pdf',
  className,
}: FileCaptureProps) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const showCamera = isTouchDevice();

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const captured: CapturedFile[] = fileArray.map((file) => ({
      file,
      previewUrl: createPreview(file),
      id: generateId(),
    }));

    if (multiple) {
      onFilesChange([...files, ...captured]);
    } else {
      files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      onFilesChange(captured.slice(0, 1));
    }
  }, [files, multiple, onFilesChange]);

  const removeFile = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="flex gap-2">
        {showCamera && (
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          {showCamera ? 'Choose Files' : 'Browse Files'}
        </Button>
      </div>

      {!showCamera && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          )}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Images and PDFs</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted group"
            >
              {f.previewUrl ? (
                <img src={f.previewUrl} alt={f.file.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileCapture;
