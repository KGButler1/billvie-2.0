import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, ScanLine, Loader as Loader2, CircleAlert as AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import FileCapture, { CapturedFile } from '@/components/shared/FileCapture';
import { BillScanService } from '@/services/BillScanService';

interface BillScanModalProps {
  onClose: () => void;
  onUpgradeClick: () => void;
}

interface StagedFile extends CapturedFile {
  status: 'pending' | 'uploading' | 'done' | 'error' | 'quota_exceeded';
  needsPro?: boolean;
}

const BillScanModal = ({ onClose, onUpgradeClick }: BillScanModalProps) => {
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [quota, setQuota] = useState<{ used: number; limit: number | null; remaining: number | null } | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState('');

  const isUnlimited = BillScanService.isUnlimitedTier();

  useEffect(() => {
    if (!isUnlimited) {
      BillScanService.getQuota().then(setQuota).catch(() => {});
    }
  }, [isUnlimited]);

  const handleFilesChange = useCallback((newFiles: CapturedFile[]) => {
    const remaining = quota?.remaining ?? Infinity;
    const staged: StagedFile[] = newFiles.map((f, i) => ({
      ...f,
      status: 'pending',
      needsPro: !isUnlimited && i >= remaining,
    }));
    setFiles(staged);
  }, [quota, isUnlimited]);

  const scannableCount = files.filter((f) => !f.needsPro).length;
  const needsProCount = files.filter((f) => f.needsPro).length;

  const handleCommit = async () => {
    setIsCommitting(true);
    setError('');

    const toScan = files.filter((f) => !f.needsPro && f.status === 'pending');

    for (const staged of toScan) {
      setFiles((prev) => prev.map((f) =>
        f.id === staged.id ? { ...f, status: 'uploading' as const } : f
      ));

      try {
        const uploaded = await BillScanService.uploadScanFile(staged.file);
        if (!uploaded) {
          setFiles((prev) => prev.map((f) =>
            f.id === staged.id ? { ...f, status: 'error' as const } : f
          ));
          continue;
        }

        const result = await BillScanService.triggerScan({
          documentId: uploaded.documentId,
          documentUrl: uploaded.documentUrl,
          documentType: staged.file.type,
          name: staged.file.name,
        });

        if ('error' in result && result.error === 'quota_exceeded') {
          setFiles((prev) => prev.map((f) =>
            f.id === staged.id ? { ...f, status: 'quota_exceeded' as const, needsPro: true } : f
          ));
        } else if ('error' in result) {
          setFiles((prev) => prev.map((f) =>
            f.id === staged.id ? { ...f, status: 'error' as const } : f
          ));
        } else {
          setFiles((prev) => prev.map((f) =>
            f.id === staged.id ? { ...f, status: 'done' as const } : f
          ));
        }
      } catch {
        setFiles((prev) => prev.map((f) =>
          f.id === staged.id ? { ...f, status: 'error' as const } : f
        ));
      }
    }

    setIsCommitting(false);
    setTimeout(() => onClose(), 800);
  };

  const commitLabel = isUnlimited
    ? `Scan ${files.length} bill${files.length !== 1 ? 's' : ''}`
    : needsProCount > 0
      ? `Scan ${scannableCount} of ${files.length} (${needsProCount} need${needsProCount !== 1 ? '' : 's'} Pro)`
      : `Scan ${files.length} bill${files.length !== 1 ? 's' : ''}`;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
      />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="pointer-events-auto w-full sm:max-w-lg sm:rounded-2xl bg-card rounded-t-3xl shadow-dramatic p-6 pb-8 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Scan Bills</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isUnlimited && quota && (
            <p className="text-sm text-muted-foreground mb-4">
              {quota.remaining !== null && quota.remaining > 0
                ? `${quota.remaining} free scan${quota.remaining !== 1 ? 's' : ''} remaining this month`
                : 'No free scans remaining this month'}
            </p>
          )}

          <FileCapture files={files} onFilesChange={handleFilesChange} multiple />

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f) => (
                <div
                  key={f.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg border transition-opacity',
                    f.needsPro && 'opacity-50'
                  )}
                >
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {f.previewUrl ? (
                      <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ScanLine className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm flex-1 truncate">{f.file.name}</span>
                  {f.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  {f.status === 'done' && <span className="text-xs text-green-600">Sent</span>}
                  {f.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                  {f.needsPro && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Needs Pro
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {needsProCount > 0 && (
            <button
              onClick={onUpgradeClick}
              className="text-sm text-primary hover:underline underline-offset-2 mt-3 inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade for unlimited AI scanning
            </button>
          )}

          {error && <p className="text-sm text-destructive mt-3">{error}</p>}

          {files.length > 0 && (
            <Button
              onClick={handleCommit}
              disabled={isCommitting || scannableCount === 0}
              className="btn-hero w-full mt-6"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                commitLabel
              )}
            </Button>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default BillScanModal;
