import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Download, FileSpreadsheet, FileJson, Loader2, Check, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { downloadCSVBundle, downloadJSON } from '@/utils/dataBackup';
import { supabase } from '@/lib/supabase';
import { getHouseholdId } from '@/services/supabaseData';
import { toast } from 'sonner';

interface DownloadDataSheetProps {
  onClose: () => void;
}

interface ExportLogEntry {
  id: string;
  format: string;
  created_at: string;
  exported_by: string | null;
  exporter_name: string | null;
}

const INCLUDED_CATEGORIES = [
  'Bills',
  'Events',
  'Documents',
  'Financial Snapshot',
  'Tax Documents',
  'Bank Accounts',
  'Payment Cards',
  'Key People',
  'Trusted People & Access',
];

const DownloadDataSheet = ({ onClose }: DownloadDataSheetProps) => {
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
  const [format, setFormat] = useState<'csv' | 'json' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<ExportLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const householdId = await getHouseholdId();
      const { data, error } = await supabase
        .from('data_export_log')
        .select('id, format, created_at, exported_by')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const userIds = [...new Set((data || []).map((r) => r.exported_by).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);
        if (profiles) {
          nameMap = Object.fromEntries(profiles.map((p) => [p.id, p.display_name]));
        }
      }

      setHistory(
        (data || []).map((r) => ({
          id: r.id,
          format: r.format,
          created_at: r.created_at,
          exported_by: r.exported_by,
          exporter_name: r.exported_by ? nameMap[r.exported_by] ?? null : null,
        }))
      );
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const logExport = async (fmt: 'csv' | 'json') => {
    try {
      const householdId = await getHouseholdId();
      await supabase.from('data_export_log').insert({
        household_id: householdId,
        format: fmt,
      });
    } catch {
      // Non-fatal — the download succeeded, logging is best-effort
    }
  };

  const handleDownload = async (fmt: 'csv' | 'json') => {
    setFormat(fmt);
    setPhase('downloading');
    setErrorMsg('');
    try {
      if (fmt === 'csv') {
        await downloadCSVBundle();
      } else {
        await downloadJSON();
      }
      await logExport(fmt);
      setPhase('done');
      toast.success('Download complete');
      await loadHistory();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('error');
      toast.error('Download failed');
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setFormat(null);
    setErrorMsg('');
  };

  const lastDownload = history.length > 0 ? history[0] : null;
  const lastDownloadLabel = lastDownload
    ? `Last downloaded ${formatDistanceToNow(parseISO(lastDownload.created_at), { addSuffix: true })}${
        lastDownload.exporter_name ? ` by ${lastDownload.exporter_name}` : ''
      } (${lastDownload.format.toUpperCase()})`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-dramatic p-6 pb-8 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="download-data-title"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 id="download-data-title" className="text-xl font-semibold">Download Your Data</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'idle' && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              A complete copy of your household's data, downloaded to your device. Keep it somewhere safe.
            </p>

            {lastDownloadLabel && (
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {lastDownloadLabel}
              </p>
            )}

            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">What's included</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {INCLUDED_CATEGORIES.map((cat) => (
                  <li key={cat}>• {cat}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Button className="w-full" onClick={() => handleDownload('csv')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download as CSV files
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleDownload('json')}>
                <FileJson className="w-4 h-4 mr-2" />
                Download as JSON
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              CSV is recommended — one file per category, opens in any spreadsheet app.
              JSON includes everything in a single raw file.
            </p>

            {history.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Download history</p>
                <div className="space-y-1.5">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-xs text-muted-foreground py-1">
                      <span>
                        {entry.exporter_name ?? 'Someone'} — {entry.format.toUpperCase()}
                      </span>
                      <span>{formatDistanceToNow(parseISO(entry.created_at), { addSuffix: true })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'downloading' && (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Gathering your data{format === 'csv' ? ' into CSV files' : ' into a JSON file'}…
            </p>
            <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <p className="text-lg font-semibold mb-1">Download complete</p>
            <p className="text-sm text-muted-foreground mb-6">
              Your {format === 'csv' ? 'ZIP file' : 'JSON file'} has been saved to your device.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleReset}>Download again</Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-lg font-semibold mb-1">Download failed</p>
            <p className="text-sm text-muted-foreground mb-4">
              {errorMsg || 'Something went wrong. Please try again.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleReset}>Try again</Button>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DownloadDataSheet;
