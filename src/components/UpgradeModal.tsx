import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, Receipt, Calendar, FileText, Share2, ChartBar as BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRO_PRICE, PRO_PERIOD, PRO_FEATURES, FREE_BILL_LIMIT, FREE_EVENT_LIMIT } from '@/constants/pricing';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'bills' | 'events' | 'financial' | 'share' | 'export' | 'scan' | 'general';
  onUpgrade?: () => void;
  onPreviewAnyway?: () => void;
}

const UPGRADE_REASONS = {
  bills: {
    title: "You've reached the bill limit",
    description: `Free accounts are limited to ${FREE_BILL_LIMIT} bills. Upgrade to add unlimited bills.`,
    icon: Receipt,
  },
  events: {
    title: "You've reached the event limit",
    description: `Free accounts are limited to ${FREE_EVENT_LIMIT} events. Upgrade to create unlimited events.`,
    icon: Calendar,
  },
  financial: {
    title: "Unlock Financial Snapshot",
    description: "Keep insurance, accounts & retirement, income and debts in one place — what a spouse or advisor would need to know.",
    icon: BarChart3,
  },
  share: {
    title: "Unlock Sharing",
    description: "Share your bills and events with partners, roommates, or accountants.",
    icon: Share2,
  },
  export: {
    title: "Unlock Export",
    description: "Export your data as PDF, CSV, or JSON for tax purposes or record keeping.",
    icon: FileText,
  },
  scan: {
    title: "You've used your 5 free scans this month",
    description: "Upgrade for unlimited AI bill scanning — snap a photo and we'll extract the details for you.",
    icon: Receipt,
  },
  general: {
    title: "Billvie Annual",
    description: "Unlock all premium features and take control of your finances.",
    icon: Sparkles,
  },
};

const FEATURES = PRO_FEATURES;

const UpgradeModal = ({ isOpen, onClose, reason = 'general', onUpgrade, onPreviewAnyway }: UpgradeModalProps) => {
  const config = UPGRADE_REASONS[reason];
  const Icon = config.icon;

  const handleUpgrade = () => {
    onUpgrade?.();
    onClose();
  };

  const handlePreviewAnyway = () => {
    onPreviewAnyway?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal wrapper for centering */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with gradient */}
            <div className="relative px-6 pt-8 pb-6 text-center" style={{ background: 'var(--gradient-accent)' }}>
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold text-primary-foreground mb-2">{config.title}</h2>
              <p className="text-primary-foreground/80 text-sm">{config.description}</p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Pricing */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">{PRO_PRICE}</span>
                  <span className="text-muted-foreground">{PRO_PERIOD}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  One plan, billed yearly
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {FEATURES.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button onClick={handleUpgrade} className="w-full btn-hero py-6">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>

              {onPreviewAnyway && (
                <Button onClick={handlePreviewAnyway} variant="outline" className="w-full py-5 mt-2">
                  Preview Anyway
                </Button>
              )}

              <p className="text-xs text-center text-muted-foreground mt-4">
                Renews annually. Cancel anytime before renewal.
              </p>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
