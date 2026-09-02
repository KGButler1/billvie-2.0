import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Users, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { FREE_BILL_LIMIT, FREE_EVENT_LIMIT } from '@/constants/pricing';

type HintType = 'events' | 'upgrade_events' | 'upgrade_bills' | 'sharing';

interface HintConfig {
  id: HintType;
  icon: React.ElementType;
  title: string;
  message: string;
  action: string;
  condition: () => boolean;
}

const HINTS_DISMISSED_KEY = 'billvie_hints_dismissed';

let hintActive = false;
export const isProgressiveHintActive = () => hintActive;

const ProgressiveHints = () => {
  const navigate = useNavigate();
  const [activeHint, setActiveHint] = useState<HintType | null>(null);
  const [dismissedHints, setDismissedHints] = useState<HintType[]>([]);

  const { profile } = useProfile();
  const isPaid = profile?.isPaid ?? false;

  const hints: HintConfig[] = [
    {
      id: 'events',
      icon: Calendar,
      title: 'Planning something big?',
      message: 'Plan and organise big moments together — trips, weddings, or any special occasion.',
      action: 'Explore Events',
      condition: () => {
        const billCount = BillService.getBillCount();
        const eventCount = EventService.getEventCount();
        return billCount >= 10 && eventCount === 0 && !isPaid;
      },
    },
    {
      id: 'upgrade_events',
      icon: Sparkles,
      title: 'Need more Events?',
      message: `You've used your free event! Upgrade for unlimited events, sharing, and analytics.`,
      action: 'Learn More',
      condition: () => {
        const eventCount = EventService.getEventCount();
        return eventCount >= FREE_EVENT_LIMIT && !isPaid;
      },
    },
    {
      id: 'upgrade_bills',
      icon: TrendingUp,
      title: 'Approaching bill limit',
      message: `You're close to ${FREE_BILL_LIMIT} bills! Upgrade for unlimited tracking and premium features.`,
      action: 'Upgrade Now',
      condition: () => {
        const billCount = BillService.getBillCount();
        return billCount >= FREE_BILL_LIMIT - 5 && billCount < FREE_BILL_LIMIT && !isPaid;
      },
    },
    {
      id: 'sharing',
      icon: Users,
      title: 'Share visibility with family?',
      message: 'Make sure you\'re not the only one who knows. Share household visibility with your partner or family.',
      action: 'Learn About Sharing',
      condition: () => {
        const bills = BillService.getAllBills();
        const hasTaggedBills = bills.some(b => (b.taggedPersonIds?.length ?? 0) > 0);
        return hasTaggedBills && !isPaid;
      },

    },
  ];

  useEffect(() => {
    // Load dismissed hints
    const stored = localStorage.getItem(HINTS_DISMISSED_KEY);
    if (stored) {
      setDismissedHints(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    // Check for active hint
    const availableHint = hints.find(
      hint => hint.condition() && !dismissedHints.includes(hint.id)
    );
    
    if (availableHint) {
      // Delay showing hint
      const timer = setTimeout(() => {
        setActiveHint(availableHint.id);
        hintActive = true;
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setActiveHint(null);
      hintActive = false;
    }
  }, [dismissedHints, isPaid]);

  const dismissHint = (hintId: HintType) => {
    const updated = [...dismissedHints, hintId];
    setDismissedHints(updated);
    localStorage.setItem(HINTS_DISMISSED_KEY, JSON.stringify(updated));
    setActiveHint(null);
    hintActive = false;
  };

  const handleAction = (hintId: HintType) => {
    switch (hintId) {
      case 'events':
        navigate('/events');
        break;
      case 'upgrade_events':
      case 'upgrade_bills':
      case 'sharing':
        navigate('/settings');
        break;
    }
    dismissHint(hintId);
  };

  const currentHint = hints.find(h => h.id === activeHint);

  if (!currentHint) return null;

  const Icon = currentHint.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-28 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{currentHint.title}</h3>
                  <button 
                    onClick={() => dismissHint(currentHint.id)}
                    className="p-1 rounded-full hover:bg-muted -mt-1 -mr-1"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentHint.message}
                </p>
                <Button 
                  size="sm" 
                  className="mt-3"
                  onClick={() => handleAction(currentHint.id)}
                >
                  {currentHint.action}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProgressiveHints;
