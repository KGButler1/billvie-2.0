import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';

export type AccessState = 'none' | 'pending' | 'active';

export const getAccessState = (): AccessState => {
  const people = PeopleService.getAll().filter((p) => p.accessLevel !== 'owner');
  const hasInvited = people.some((p) => p.status === 'invited');
  const hasActive = AccessService.getActivePeople().length > 0;
  if (hasActive) return 'active';
  if (hasInvited) return 'pending';
  return 'none';
};
