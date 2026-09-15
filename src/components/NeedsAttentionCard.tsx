import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, Clock, X, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { AttentionService, AttentionItem, AttentionSeverity } from '@/services/AttentionService';
import { useProfile } from '@/hooks/useProfile';
import { useViewerAccess } from '@/hooks/useViewerAccess';
import { toast } from 'sonner';
import { SkeletonRows } from '@/components/ui/skeleton';

const severityOrder: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };

const severityIcon = (severity: AttentionSeverity) => {
  switch (severity) {
    case 'critical': return <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    case 'info': return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  }
};

const severityBorder = (severity: AttentionSeverity) => {
  switch (severity) {
    case 'critical': return 'border-l-destructive';
    case 'warning': return 'border-l-amber-500';
    case 'info': return 'border-l-blue-500';
  }
};

const severityLabel = (severity: AttentionSeverity) => {
  switch (severity) {
    case 'critical': return 'Critical';
    case 'warning': return 'Warning';
    case 'info': return 'Info';
  }
};

interface NeedsAttentionCardProps {
  onCriticalSeen?: (hasCritical: boolean) => void;
}

const NeedsAttentionCard = ({ onCriticalSeen }: NeedsAttentionCardProps) => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { isAdmin } = useViewerAccess();
  const isPaid = profile?.isPaid ?? false;

  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const all = await AttentionService.fetchItems();
      setItems(all);
      const hasCritical = all.some((i) => i.severity === 'critical');
      onCriticalSeen?.(hasCritical);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [onCriticalSeen]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadItems();
  }, [loadItems, isAdmin]);

  const handleSnooze = async (item: AttentionItem) => {
    setActionLoading(`${item.ruleKey}:${item.entityId ?? ''}`);
    try {
      await AttentionService.snooze(item.ruleKey, item.entityId, 30);
      toast.success('Snoozed for 30 days');
      await loadItems();
    } catch {
      toast.error('Could not snooze this item. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (item: AttentionItem) => {
    setActionLoading(`${item.ruleKey}:${item.entityId ?? ''}`);
    try {
      await AttentionService.dismiss(item.ruleKey, item.entityId);
      toast.success("Won't remind you about this again");
      await loadItems();
    } catch {
      toast.error('Could not dismiss this item. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) return null;

  const visibleItems = isPaid
    ? items
    : items.filter((i) => !i.paidOnly);

  const hiddenCount = items.length - visibleItems.length;

  const sorted = [...visibleItems].sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return 0;
  });

  const displayItems = showAll ? sorted : sorted.slice(0, 5);

  if (loading) {
    return (
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Needs attention</p>
        <div className="bg-card rounded-xl border border-border p-4">
          <SkeletonRows rows={2} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Needs attention</p>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Couldn't load reminders.</p>
            <button onClick={loadItems} className="text-sm text-primary hover:underline">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (sorted.length === 0 && hiddenCount === 0) {
    return (
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Needs attention</p>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 py-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Nothing needs your attention — your household is up to date</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Needs attention</p>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {displayItems.map((item, idx) => {
            const actionKey = `${item.ruleKey}:${item.entityId ?? ''}`;
            const isActing = actionLoading === actionKey;
            return (
              <motion.div
                key={`${item.ruleKey}-${item.entityId ?? 'null'}-${idx}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`bg-card rounded-xl border border-border border-l-4 ${severityBorder(item.severity)} p-4`}
              >
                <div className="flex items-start gap-3">
                  {severityIcon(item.severity)}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate(item.actionPath)}
                      className="text-left w-full"
                    >
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      {item.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isPaid && (
                      <>
                        <button
                          onClick={() => handleSnooze(item)}
                          disabled={isActing}
                          aria-label={`Snooze ${item.title} for 30 days`}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                        <button
                          onClick={() => handleDismiss(item)}
                          disabled={isActing}
                          aria-label={`Dismiss ${item.title}`}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </>
                    )}
                    {item.category === 'gap' && !isPaid && (
                      <button
                        onClick={() => handleDismiss(item)}
                        disabled={isActing}
                        aria-label={`Don't remind me about ${item.title}`}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {sorted.length > 5 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-sm text-primary hover:underline py-2"
          >
            Show all {sorted.length}
          </button>
        )}
        {showAll && sorted.length > 5 && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
          >
            Show fewer
          </button>
        )}

        {hiddenCount > 0 && !isPaid && (
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground py-2 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <span>{hiddenCount} more item{hiddenCount !== 1 ? 's' : ''} with Smart Reminders</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NeedsAttentionCard;
