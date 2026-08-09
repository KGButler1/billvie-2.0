import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';
import { getAccessState } from '@/utils/accessState';
import { isDemoModeActive } from '@/demo/demoFlag';

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

const PeopleBubbleRow = () => {
  const navigate = useNavigate();
  const demoPrefix = (path: string) => (isDemoModeActive() ? `/demo${path}` : path);
  const state = getAccessState();
  const activePeople = AccessService.getActivePeople();
  const invitedPeople = PeopleService.getAll().filter(
    (p) => p.status === 'invited' && p.accessLevel !== 'owner'
  );

  if (state === 'none') {
    return (
      <div className="mb-6">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Household Access
        </h2>
        <button
          onClick={() => navigate(demoPrefix('/people?invite=1'))}
          className="w-12 h-12 rounded-full border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center"
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  const allPeople = [...activePeople, ...invitedPeople];

  return (
    <div className="mb-6">
      <button
        onClick={() => navigate(demoPrefix('/people'))}
        className="flex items-center justify-between w-full mb-3"
      >
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Household Access
        </h2>
        <span className="text-xs text-primary">
          View all ({allPeople.length})
        </span>
      </button>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {allPeople.map((person) => {
          const isPending = person.status === 'invited';
          return (
            <button
              key={person.id}
              onClick={() => navigate(demoPrefix('/people'))}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isPending
                    ? 'bg-amber-500/10 text-amber-700 ring-2 ring-amber-500/40 ring-offset-2 ring-offset-background'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {initials(person.name)}
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[3.5rem] truncate">
                {person.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PeopleBubbleRow;
