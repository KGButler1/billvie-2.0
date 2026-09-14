import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Database, Trash2, Eye, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserService } from '@/services/UserService';
import { EventService } from '@/services/EventService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { BillService, calculateNextDueDate } from '@/services/BillService';
import { Bill } from '@/types/bill';
import { format, parseISO } from 'date-fns';

interface DevPanelProps {
  onClose: () => void;
  onDataChange: () => void;
}

const DevPanel = ({ onClose, onDataChange }: DevPanelProps) => {
  const [showStorage, setShowStorage] = useState(false);
  const [candidates, setCandidates] = useState<Bill[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  const handleToggleEvents = () => {
    UserService.saveSettings({
      hasEventsAccess: !UserService.getSettings().hasEventsAccess
    });
  };

  const handleClearData = async () => {
    UserService.clearAllData();
    await Promise.all([
      EventService.clearAllEvents(),
      FinancialInfoService.clearAll(),
      BillService.clearAllBills(),
    ]);
    onDataChange();
  };

  const storageState = UserService.getLocalStorageState();

  const handleDryRun = () => {
    const list = BillService.getBackfillCandidates();
    setCandidates(list);
    setSelected(new Set(list.map((b) => b.id)));
    setResult(null);
  };

  const toggleCandidate = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!candidates) return;
    const toCreate = candidates.filter((b) => selected.has(b.id));
    setGenerating(true);
    let created = 0;
    let failed = 0;
    for (const bill of toCreate) {
      try {
        await BillService.generateNextOccurrence(bill);
        created++;
      } catch {
        failed++;
      }
    }
    setGenerating(false);
    setResult({ created, failed });
    setCandidates(null);
    setSelected(new Set());
    onDataChange();
  };

  const computeNextDueDate = (bill: Bill): string => {
    if (!bill.dueDate || !bill.recurringInterval) return '?';
    let next = calculateNextDueDate(bill.dueDate, bill.recurringInterval);
    while (new Date(next) < new Date()) {
      next = calculateNextDueDate(next, bill.recurringInterval);
    }
    return next;
  };

  // Flag potential duplicate series by similar names
  const flagSimilarNames = (list: Bill[]): string[] => {
    const flags: string[] = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i].name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const b = list[j].name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (a === b) {
          flags.push(`"${list[i].name}" and "${list[j].name}" have the same words — confirm they're separate series or duplicates`);
        }
      }
    }
    return flags;
  };

  const similarFlags = candidates ? flagSimilarNames(candidates) : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="dev-panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Database className="w-4 h-4" />
          Dev Panel
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Events Access Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Events Access</span>
          <Button
            variant={UserService.getSettings().hasEventsAccess ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleEvents}
          >
            {UserService.getSettings().hasEventsAccess ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        {/* View Storage State */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStorage(!showStorage)}
          className="w-full"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showStorage ? 'Hide' : 'View'} localStorage
        </Button>

        {showStorage && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(storageState, null, 2)}
          </pre>
        )}

        {/* Backfill: dry-run candidate list */}
        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium mb-2">Recurring Bill Backfill</p>
          <p className="text-xs text-muted-foreground mb-2">
            Find paid recurring bills that never got a successor row (marked Handled before the rollover feature shipped).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDryRun}
            className="w-full mb-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Dry-run: list candidates
          </Button>

          {candidates && (
            <div className="space-y-2">
              {candidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">No candidates found — all paid recurring bills already have successors.</p>
              ) : (
                <>
                  {similarFlags.length > 0 && (
                    <div className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2 space-y-1">
                      {similarFlags.map((f, i) => (
                        <p key={i} className="flex items-start gap-1 text-amber-800 dark:text-amber-200">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          {f}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="max-h-60 overflow-auto space-y-1">
                    {candidates.map((bill) => (
                      <label
                        key={bill.id}
                        className="flex items-start gap-2 p-2 rounded border border-border hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(bill.id)}
                          onChange={() => toggleCandidate(bill.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{bill.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {bill.dueDate ? format(parseISO(bill.dueDate), 'MMM d, yyyy') : '?'} ·
                            Paid {bill.paidDate ? format(parseISO(bill.paidDate), 'MMM d, yyyy') : '?'} ·
                            {bill.amount != null ? ` $${bill.amount}` : ''}
                          </p>
                          <p className="text-xs text-primary">
                            Next: {format(parseISO(computeNextDueDate(bill)), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generating || selected.size === 0}
                    className="w-full"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {generating ? 'Generating...' : `Generate ${selected.size} successor${selected.size === 1 ? '' : 's'}`}
                  </Button>
                </>
              )}
            </div>
          )}

          {result && (
            <div className="text-xs bg-muted p-2 rounded mt-2">
              <p className="text-green-600 dark:text-green-400">Created: {result.created}</p>
              {result.failed > 0 && (
                <p className="text-destructive">Failed: {result.failed}</p>
              )}
            </div>
          )}
        </div>

        {/* Clear All Data */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearData}
          className="w-full"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All Data
        </Button>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Ctrl+Shift+D to toggle
        </p>
      </div>
    </motion.div>
  );
};

export default DevPanel;
