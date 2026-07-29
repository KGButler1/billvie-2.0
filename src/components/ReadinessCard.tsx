import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ShieldCheck } from 'lucide-react';
import {
  getReadinessSummary,
  isReadinessCardDismissed,
  dismissReadinessCard,
} from '@/utils/readiness';

const ReadinessCard = () => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => isReadinessCardDismissed());
  const { covered, total } = getReadinessSummary();

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissReadinessCard();
    setDismissed(true);
  };

  return (
    <div className="w-full mb-6 p-4 rounded-xl bg-card border border-border flex items-center gap-3">
      <button
        onClick={() => navigate('/readiness')}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{covered} of {total} areas covered</p>
          <p className="text-xs text-muted-foreground">How ready is your household?</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Hide readiness summary"
        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ReadinessCard;
