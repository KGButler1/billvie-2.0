import { ReactNode } from 'react';
import { EyeOff } from 'lucide-react';
import { useViewerAccess } from '@/hooks/useViewerAccess';
import { AccessScope } from '@/types/people';

interface ScopeGateProps {
  scope: AccessScope;
  children: ReactNode;
  compact?: boolean;
}

const ScopeGate = ({ scope, children, compact = false }: ScopeGateProps) => {
  const { isAdmin, canSee } = useViewerAccess();

  if (isAdmin || canSee(scope)) return <>{children}</>;

  if (compact) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
        <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <p className="text-sm text-muted-foreground">You don't have access to this</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
        <EyeOff className="w-7 h-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-1">You don't have access to this</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Ask an owner or co-owner if you need to see this
      </p>
    </div>
  );
};

export default ScopeGate;
