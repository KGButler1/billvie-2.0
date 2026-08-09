import { useState } from 'react';
import { Upload, Link2, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FileCapture, { CapturedFile } from '@/components/shared/FileCapture';
import { HouseholdDocument } from '@/types/document';
import { FileAttachment } from '@/types/sharing';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export interface WhereToFindItValue {
  attachment?: FileAttachment;
  externalLink?: string;
  physicalLocation?: string;
}

interface WhereToFindItProps {
  document?: HouseholdDocument;
  onChange: (value: WhereToFindItValue) => void;
  onStorageFull?: () => void;
}

const WhereToFindIt = ({ document: doc, onChange, onStorageFull }: WhereToFindItProps) => {
  const [attachment, setAttachment] = useState<FileAttachment | undefined>(doc?.attachment);
  const [capturedFiles, setCapturedFiles] = useState<CapturedFile[]>([]);
  const [link, setLink] = useState(doc?.externalLink ?? '');
  const [location, setLocation] = useState(doc?.physicalLocation ?? '');
  const [linkError, setLinkError] = useState('');

  const hasAttachment = !!attachment || !!link.trim() || !!location.trim();

  const updateAttachment = (att?: FileAttachment) => {
    setAttachment(att);
    onChange({ attachment: att, externalLink: link.trim() || undefined, physicalLocation: location.trim() || undefined });
  };

  const updateLink = (val: string) => {
    setLink(val);
    setLinkError('');
    onChange({ attachment, externalLink: val.trim() || undefined, physicalLocation: location.trim() || undefined });
  };

  const updateLocation = (val: string) => {
    setLocation(val);
    onChange({ attachment, externalLink: link.trim() || undefined, physicalLocation: val.trim() || undefined });
  };

  const handleFileCaptured = async () => {
    if (capturedFiles.length === 0) return;
    const file = capturedFiles[0].file;
    try {
      const dataUrl = await fileToBase64(file);
      const newAttachment: FileAttachment = {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      };
      updateAttachment(newAttachment);
    } catch (e) {
      if (e instanceof Error && e.message === 'STORAGE_FULL') {
        onStorageFull?.();
        setAttachment(undefined);
        setCapturedFiles([]);
      } else {
        throw e;
      }
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium block">
        Where to find it <span className="text-muted-foreground font-normal">(optional)</span>
      </label>

      {/* Upload */}
      <div className="space-y-2">
        {attachment ? (
          <div className="border border-border rounded-lg p-3">
            <div className="flex items-center gap-3">
              {attachment.type.startsWith('image/') ? (
                <img src={attachment.dataUrl} alt={attachment.name} className="w-12 h-12 object-cover rounded-lg" />
              ) : (
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{attachment.name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => updateAttachment(undefined)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <FileCapture
            files={capturedFiles}
            onFilesChange={(files) => {
              setCapturedFiles(files);
              if (files.length > 0) handleFileCaptured();
            }}
            multiple={false}
          />
        )}
        <p className="text-xs text-muted-foreground">
          PDF or image, up to 500KB. Stored privately — only you and people you share with can open it.
        </p>
      </div>

      {/* Link */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link2 className="w-3.5 h-3.5" /> or link to it
        </div>
        <Input
          placeholder="https://..."
          value={link}
          onChange={(e) => updateLink(e.target.value)}
        />
        {linkError && <p className="text-xs text-destructive">{linkError}</p>}
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" /> or just say where it is
        </div>
        <Input
          placeholder="e.g. Fireproof box in the study, top shelf"
          value={location}
          onChange={(e) => updateLocation(e.target.value)}
        />
      </div>

      {!hasAttachment && (
        <p className="text-xs text-muted-foreground">
          The record above already helps. This makes it easier to find.
        </p>
      )}
    </div>
  );
};

export default WhereToFindIt;
