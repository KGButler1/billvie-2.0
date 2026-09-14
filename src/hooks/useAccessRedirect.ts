import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewerAccess } from '@/hooks/useViewerAccess';
import { AccessScope } from '@/types/people';
import { isDemoModeActive } from '@/demo/demoFlag';

export const useAccessRedirect = (scope: AccessScope) => {
  const { isAdmin, canSee, accessLoading } = useViewerAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (accessLoading) return;
    if (isAdmin || canSee(scope)) return;
    navigate(isDemoModeActive() ? '/demo/dashboard' : '/dashboard', { replace: true });
  }, [accessLoading, isAdmin, canSee, scope, navigate]);

  return { accessLoading, allowed: accessLoading || isAdmin || canSee(scope) };
};
