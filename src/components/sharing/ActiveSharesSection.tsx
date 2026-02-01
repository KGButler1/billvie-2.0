import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trash2, ChevronRight, Link2, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Share, ActivityLogEntry, SHARE_PERMISSION_LABELS } from '@/types/sharing';
import { SharingService } from '@/services/SharingService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActiveSharesSectionProps {
  className?: string;
}

const ActiveSharesSection = ({ className }: ActiveSharesSectionProps) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = () => {
    setShares(SharingService.getAllShares());
    setActivity(SharingService.getRecentActivity());
  };

  const handleRevoke = (shareId: string) => {
    if (confirm('Are you sure you want to revoke this access?')) {
      SharingService.revokeShare(shareId);
      loadShares();
    }
  };

  if (shares.length === 0 && activity.length === 0) {
    return null;
  }

  const acceptedShares = shares.filter(s => s.status === 'accepted');
  const pendingShares = shares.filter(s => s.status === 'pending');

  return (
    <section className={cn('mb-8', className)}>
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Sharing
      </h2>
      
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Active shares */}
        {acceptedShares.length > 0 && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium mb-3">Active Access</h3>
            <div className="space-y-3">
              {acceptedShares.map((share) => (
                <div 
                  key={share.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {share.sharedWithName || share.sharedWithEmail}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {share.resourceName} • {SHARE_PERMISSION_LABELS[share.permission]}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(share.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending shares */}
        {pendingShares.length > 0 && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Pending Invites
            </h3>
            <div className="space-y-2">
              {pendingShares.map((share) => (
                <div 
                  key={share.id}
                  className="flex items-center gap-3 p-2 text-sm"
                >
                  <span className="text-muted-foreground truncate flex-1">
                    {share.sharedWithEmail}
                  </span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity log toggle */}
        {activity.length > 0 && (
          <button
            onClick={() => setShowActivity(!showActivity)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-medium">Recent Activity</span>
            <motion.div animate={{ rotate: showActivity ? 90 : 0 }}>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </button>
        )}

        {/* Activity log */}
        <AnimatePresence>
          {showActivity && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-2">
                {activity.slice(0, 10).map((entry) => (
                  <div 
                    key={entry.id}
                    className="flex items-start gap-3 p-2 text-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">
                        <span className="font-medium">{entry.performedByName || 'Someone'}</span>
                        {' '}{entry.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ActiveSharesSection;
