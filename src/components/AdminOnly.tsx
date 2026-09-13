import { ReactNode } from 'react';
import { useViewerAccess } from '@/hooks/useViewerAccess';

interface AdminOnlyProps {
  children: ReactNode;
}

const AdminOnly = ({ children }: AdminOnlyProps) => {
  const { isAdmin } = useViewerAccess();
  if (!isAdmin) return null;
  return <>{children}</>;
};

export default AdminOnly;
