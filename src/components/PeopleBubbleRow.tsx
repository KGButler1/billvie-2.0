import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';
import { getAccessState } from '@/utils/accessState';
import { isDemoModeActive } from '@/demo/demoFlag';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { ACCESS_SCOPE_LABELS } from '@/types/people';

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
  const [isLoading, setIsLoading] = useState(() => !(PeopleService.isLoaded() && AccessService.isLoaded()));
  useEffect(() => { if (PeopleService.isLoaded() && AccessService.isLoaded()) setIsLoading(false); });
  if (isLoading) return <SkeletonCard className="h-full" />;
  const demoPrefix = (path: string) => (isDemoModeActive() ? `/demo${path}` : path);
  const state = getAccessState();
  const activePeople = AccessService.getActivePeople();
  const invitedPeople = PeopleService.getAll().filter(
    (p) => p.status === 'invited' && p.accessLevel !== 'owner'
  );

  if (state === 'none') {
    return (
      <div className="bg-card border border-border rounded-xl p-4 h-full flex flex-col justify-center">
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

  const acceptedNoAccessPeople = PeopleService.getAll().filter(
    (p) =>
      p.status === 'active' &&
      p.accessLevel !== 'owner' &&
      p.accessLevel !== 'co_owner' &&
      AccessService.getGrantsForPerson(p.id).length === 0
  );

  const allPeople = [...activePeople, ...acceptedNoAccessPeople, ...invitedPeople];

  const getBubbleClass = (person: typeof allPeople[number]) => {
    if (person.status === 'invited') {
      return 'bg-amber-500/10 text-amber-700 ring-amber-500/40';
    }
    const hasGrants = AccessService.getGrantsForPerson(person.id).length > 0;
    const isCoOwner = person.accessLevel === 'co_owner';
    if (hasGrants || isCoOwner) {
      return 'bg-primary/10 text-primary hover:bg-primary/20 ring-transparent';
    }
    return 'bg-muted text-muted-foreground ring-muted-foreground/30';
  };

  const getTooltipContent = (person: typeof allPeople[number]) => {
    const first = person.name.split(' ')[0];
    if (person.status === 'invited') {
      return `Invited — waiting for ${first} to accept`;
    }
    const hasGrants = AccessService.getGrantsForPerson(person.id).length > 0;
    const isCoOwner = person.accessLevel === 'co_owner';
    if (!hasGrants && !isCoOwner) {
      return `${first} — signed in, no access yet`;
    }
    const scopes = AccessService.getGrantsForPerson(person.id)
      .filter((g) => !g.revokedAt)
      .map((g) => ACCESS_SCOPE_LABELS[g.scope]);
    if (isCoOwner && scopes.length === 0) {
      return `${first} has access`;
    }
    if (scopes.length > 0) {
      return `${first} can see: ${scopes.join(', ')}`;
    }
    return `${first} has access`;
  };

  const handleClick = (person: typeof allPeople[number]) => {
    if (person.status === 'active') {
      navigate(demoPrefix(`/people?preview=${person.id}`));
    } else {
      navigate(demoPrefix('/people'));
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 h-full">
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
      <TooltipProvider delayDuration={200}>
        <div
          className="flex gap-3 overflow-x-auto pb-1 pt-2"
          style={{ maskImage: 'linear-gradient(to right, black 90%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)' }}
        >
          {allPeople.map((person) => {
            const isPending = person.status === 'invited';
            const isActive = person.status === 'active';
            const hasGrants = AccessService.getGrantsForPerson(person.id).length > 0;
            const isCoOwner = person.accessLevel === 'co_owner';
            const showEyeBadge = isActive && (hasGrants || isCoOwner);
            return (
              <Tooltip key={person.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleClick(person)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                  >
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors ring-2 ring-offset-2 ring-offset-background ${getBubbleClass(person)}`}
                      >
                        {initials(person.name)}
                      </div>
                      {showEyeBadge && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                          aria-label={`Click to see a preview of what ${person.name.split(' ')[0]} can see`}
                        >
                          <Eye className="w-2.5 h-2.5 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground max-w-[3.5rem] truncate">
                      {person.name.split(' ')[0]}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {getTooltipContent(person)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default PeopleBubbleRow;
