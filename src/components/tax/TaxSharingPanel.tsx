import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, UserPlus, X, Shield, Eye, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Share, TaxCategory, SHARE_PERMISSION_LABELS } from '@/types/sharing';
import { SharingService } from '@/services/SharingService';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { cn } from '@/lib/utils';

interface TaxSharingPanelProps {
  onAddShare: () => void;
  onRequireUpgrade: () => void;
  isPaid: boolean;
}

export const TaxSharingPanel = ({ onAddShare, onRequireUpgrade, isPaid }: TaxSharingPanelProps) => {
  const [shares, setShares] = useState<Share[]>([]);
  const allCategories = TaxDocumentService.getCategories();

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = () => {
    const taxShares = SharingService.getSharesByType('tax_documents');
    setShares(taxShares);
  };

  const handleRevoke = (shareId: string) => {
    const share = shares.find(s => s.id === shareId);
    if (!share) return;
    
    if (confirm(`Revoke access for ${share.sharedWithName || share.sharedWithEmail}?`)) {
      SharingService.revokeShare(shareId);
      loadShares();
    }
  };

  const getCategoryLabel = (id: string) => allCategories.find(c => c.id === id)?.label || id;

  if (shares.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Give someone else access</h3>
            <p className="text-sm text-muted-foreground">
              Let a trusted person or professional see what they need
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={isPaid ? onAddShare : onRequireUpgrade}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {isPaid ? 'Invite someone' : 'Upgrade to Share'}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Shared Access
        </h3>
        <Button variant="ghost" size="sm" onClick={onAddShare}>
          <UserPlus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-3">
        {shares.map((share) => (
          <motion.div
            key={share.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
              {(share.sharedWithName || share.sharedWithEmail).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {share.sharedWithName || share.sharedWithEmail}
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  share.status === 'accepted' ? "bg-green-500/20 text-green-600" :
                  share.status === 'pending' ? "bg-yellow-500/20 text-yellow-600" :
                  "bg-red-500/20 text-red-600"
                )}>
                  {share.status}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                {share.permission === 'view' ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <Edit3 className="w-3 h-3" />
                )}
                <span>{SHARE_PERMISSION_LABELS[share.permission]}</span>
              </div>
              
              {/* Show shared categories/years if restricted */}
              {(share.sharedCategories || share.sharedYears) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {share.sharedCategories?.map(catId => (
                    <span key={catId} className="text-xs bg-background px-2 py-0.5 rounded-full border border-border">
                      {getCategoryLabel(catId)}
                    </span>
                  ))}
                  {share.sharedYears?.map(year => (
                    <span key={year} className="text-xs bg-background px-2 py-0.5 rounded-full border border-border">
                      {year}
                    </span>
                  ))}
                  {!share.sharedCategories && !share.sharedYears && (
                    <span className="text-xs text-muted-foreground">All documents</span>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => handleRevoke(share.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
