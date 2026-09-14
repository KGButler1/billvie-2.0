import { ReactNode } from 'react';
import { useViewerAccess } from '@/hooks/useViewerAccess';

interface EditOnlyProps {
  children: ReactNode;
}

const EditOnly = ({ children }: EditOnlyProps) => {
  const { canEdit } = useViewerAccess();
  if (!canEdit) return null;
  return <>{children}</>;
};

export default EditOnly;
