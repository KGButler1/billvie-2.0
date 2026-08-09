import { useState } from 'react';
import { X } from 'lucide-react';

interface DismissibleIntroProps {
  storageKey: string;
  children: React.ReactNode;
}

const DismissibleIntro = ({ storageKey, children }: DismissibleIntroProps) => {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === 'true');

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  return (
    <div className="relative rounded-xl border border-border bg-muted/30 p-4 pr-10 mb-6">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 p-1 hover:bg-muted rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
};

export default DismissibleIntro;
