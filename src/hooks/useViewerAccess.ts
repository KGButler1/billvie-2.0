import { useAuth } from '@/hooks/useAuth';
import { PeopleService } from '@/services/PeopleService';
import { AccessService } from '@/services/AccessService';
import { AccessScope } from '@/types/people';

export interface ViewerAccess {
  isAdmin: boolean;
  canEdit: boolean;
  canSee: (scope: AccessScope) => boolean;
  trustedPersonId?: string;
}

export const useViewerAccess = (): ViewerAccess => {
  const { user } = useAuth();
  const me = PeopleService.getAll().find((p) => p.userId === user?.id);
  const isAdmin = me?.accessLevel === 'owner' || me?.accessLevel === 'co_owner';
  const trustedPersonId = me?.id;
  const canEdit = isAdmin || (me?.canEdit ?? false);

  const canSee = (scope: AccessScope): boolean => {
    if (isAdmin) return true;
    if (!trustedPersonId) return false;
    return AccessService.canSee(trustedPersonId, scope);
  };

  return { isAdmin, canEdit, canSee, trustedPersonId };
};
