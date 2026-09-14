import { ReactNode } from 'react';
import { useViewerAccess } from '@/hooks/useViewerAccess';
import { AccessScope } from '@/types/people';
import { SkeletonCard } from '@/components/ui/skeleton';

interface AccessAwareSectionProps {
  category: AccessScope;
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  hasError?: boolean;
  onRetry?: () => void;
}

const AccessAwareSection = ({
  category,
  children,
  loadingFallback,
  errorFallback,
  hasError = false,
  onRetry,
}: AccessAwareSectionProps) => {
  const { role, isAdmin, canSee, accessLoading } = useViewerAccess();

  if (accessLoading) {
    return <>{loadingFallback ?? <SkeletonCard />}</>;
  }

  if (isAdmin || canSee(category)) {
    if (hasError) {
      if (errorFallback) return <>{errorFallback}</>;
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Couldn't load this.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm text-primary hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      );
    }
    return <>{children}</>;
  }

  return null;
};

export default AccessAwareSection;
