import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, FileText, Home, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingService } from '@/services/OnboardingService';

interface Nudge {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const NUDGES: Nudge[] = [
  {
    id: 'add_contact',
    icon: User,
    title: 'Add one contact your family may need',
    description: 'A plumber, accountant, or someone to call in a pinch.',
  },
  {
    id: 'upload_document',
    icon: FileText,
    title: 'Upload one important document',
    description: 'A lease, insurance policy, or anything hard to find in a hurry.',
  },
  {
    id: 'add_another_bill',
    icon: Home,
    title: 'Add another household bill',
    description: 'The more you add, the clearer things are for your family.',
  },
  {
    id: 'invite_someone',
    icon: Users,
    title: 'Invite someone you trust',
    description: 'Share visibility so you\'re not the only one who knows.',
  },
];

const FirstWeekNudges = () => {
  const [activeNudge, setActiveNudge] = useState<Nudge | null>(null);

  useEffect(() => {
    const state = OnboardingService.getNudgeState();
    if (!state) return;

    const active = OnboardingService.getActiveNudges();
    if (active.length === 0) return;

    // Show one nudge at a time, with a delay
    const timer = setTimeout(() => {
      const nudge = NUDGES.find(n => n.id === active[0]);
      if (nudge) setActiveNudge(nudge);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = (nudgeId: string) => {
    OnboardingService.dismissNudge(nudgeId);
    setActiveNudge(null);
  };

  if (!activeNudge) return null;

  const Icon = activeNudge.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-28 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="bg-card border border-border rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm">{activeNudge.title}</h3>
                <button
                  onClick={() => dismiss(activeNudge.id)}
                  className="p-1 rounded-full hover:bg-muted -mt-1 -mr-1"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{activeNudge.description}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="ghost" onClick={() => dismiss(activeNudge.id)}>
                  Not now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FirstWeekNudges;
