import { PeopleService } from '@/services/PeopleService';

export type AccessState = 'none' | 'pending' | 'active';

export const getAccessState = (): AccessState => {
  const people = PeopleService.getAll().filter((p) => p.accessLevel !== 'owner');
  const hasInvited = people.some((p) => p.status === 'invited');
  const hasAccepted = people.some((p) => p.status === 'active');
  if (hasAccepted) return 'active';
  if (hasInvited) return 'pending';
  return 'none';
};
