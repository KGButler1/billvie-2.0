import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { OnboardingService } from '@/services/OnboardingService';
import { SuggestionsService, Suggestion } from '@/services/SuggestionsService';

interface DashboardSuggestionsProps {
  fabMenuOpen?: boolean;
}

const DashboardSuggestions = ({ fabMenuOpen = false }: DashboardSuggestionsProps) => {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const navigate = useNavigate();
  const { profile } = useProfile();
  const isPaid = profile?.isPaid ?? false;

  useEffect(() => {
    if (!OnboardingService.isCompleted()) return;

    const timer = setTimeout(() => {
      setSuggestion(SuggestionsService.getEligibleSuggestion(isPaid));
    }, 5000);

    return () => clearTimeout(timer);
  }, [isPaid]);

  const dismiss = () => {
    if (suggestion) SuggestionsService.dismiss(suggestion.id);
    setSuggestion(null);
  };

  const handleCTA = () => {
    if (!suggestion) return;
    dismiss();
    navigate(suggestion.actionPath);
  };

  if (!suggestion || fabMenuOpen) return null;

  const Icon = suggestion.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-44 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{suggestion.title}</h3>
                  <button
                    onClick={dismiss}
                    className="p-1 rounded-full hover:bg-muted -mt-1 -mr-1"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                <Button size="sm" className="mt-3 gap-1.5" onClick={handleCTA}>
                  {suggestion.action}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DashboardSuggestions;
