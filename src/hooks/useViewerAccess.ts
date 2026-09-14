import { useAuth } from '@/hooks/useAuth';
import { PeopleService } from '@/services/PeopleService';
import { AccessService } from '@/services/AccessService';
import { AccessScope, PersonRole } from '@/types/people';

export type ViewerRole = 'owner' | 'co_owner' | 'restricted';

export interface ViewerAccess {
  role: ViewerRole;
  personRole?: PersonRole;
  isAdmin: boolean;
  canEdit: boolean;
  canSee: (scope: AccessScope) => boolean;
  trustedPersonId?: string;
  accessLoading: boolean;
}

export const useViewerAccess = (): ViewerAccess => {
  const { user } = useAuth();
  const accessLoading = !PeopleService.isLoaded() || !AccessService.isLoaded();

  const me = PeopleService.getAll().find((p) => p.userId === user?.id);
  const isAdmin = me?.accessLevel === 'owner' || me?.accessLevel === 'co_owner';
  const trustedPersonId = me?.id;
  const canEdit = isAdmin || (me?.canEdit ?? false);
  const personRole = me?.role;

  const role: ViewerRole = me?.accessLevel === 'owner'
    ? 'owner'
    : me?.accessLevel === 'co_owner'
      ? 'co_owner'
      : 'restricted';

  const canSee = (scope: AccessScope): boolean => {
    if (isAdmin) return true;
    if (!trustedPersonId) return false;
    return AccessService.canSee(trustedPersonId, scope);
  };

  return { role, personRole, isAdmin, canEdit, canSee, trustedPersonId, accessLoading };
};
