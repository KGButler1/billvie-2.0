import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Phone, Plus, BookUser } from 'lucide-react';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';
import { useViewerAccess } from '@/hooks/useViewerAccess';
import { KeyPerson, KEY_PERSON_RELATIONSHIP_LABELS, KeyPersonRelationship } from '@/types/keyPerson';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import EditOnly from '@/components/EditOnly';
import { isDemoModeActive } from '@/demo/demoFlag';

const relationshipLabel = (value: string) =>
  KEY_PERSON_RELATIONSHIP_LABELS[value as KeyPersonRelationship] ?? value;

const KeyContactsWidget = () => {
  const navigate = useNavigate();
  const { isAdmin, canSee, accessLoading, trustedPersonId } = useViewerAccess();
  const [people, setPeople] = useState<KeyPerson[]>([]);
  const [isLoading, setIsLoading] = useState(() => !KeyPeopleService.isLoaded());
  const [error, setError] = useState(false);

  useEffect(() => {
    if (accessLoading) return;
    if (!isAdmin && !canSee('key_people')) return;
    setIsLoading(!KeyPeopleService.isLoaded());
    KeyPeopleService.refresh()
      .then(() => setPeople(KeyPeopleService.getAllKeyPeople()))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [accessLoading, isAdmin, canSee]);

  if (accessLoading || (!isAdmin && !canSee('key_people'))) return null;

  const demoPrefix = isDemoModeActive() ? '/demo' : '';

  const visiblePeople = isAdmin
    ? people
    : people.filter((p) => {
        if (!trustedPersonId) return false;
        return AccessService.canSee(trustedPersonId, 'key_people', p.id);
      });

  const displayPeople = visiblePeople.slice(0, 5);

  return (
    <div>
      <Link
        to={`${demoPrefix}/key-people`}
        className="flex items-center justify-between w-full mb-3"
      >
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Key Contacts</h2>
        <span className="text-xs text-primary flex items-center gap-1">
          View all ({visiblePeople.length}) <ChevronRight className="w-3 h-3" />
        </span>
      </Link>

      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 px-6 text-center border border-border rounded-xl">
          <p className="text-sm text-muted-foreground mb-3">Couldn't load key contacts.</p>
          <button
            onClick={() => {
              setError(false);
              setIsLoading(true);
              KeyPeopleService.refresh()
                .then(() => setPeople(KeyPeopleService.getAllKeyPeople()))
                .catch(() => setError(true))
                .finally(() => setIsLoading(false));
            }}
            className="text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      ) : displayPeople.length === 0 ? (
        <div className="border border-border rounded-xl p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <BookUser className="w-5 h-5 text-primary" />
          </div>
          {isAdmin ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Add the people someone would need to call — a doctor, lawyer, insurer, neighbour.
              </p>
              <EditOnly>
                <Button
                  size="sm"
                  onClick={() => navigate(`${demoPrefix}/key-people?add=1`)}
                  className="gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add key person
                </Button>
              </EditOnly>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No key contacts recorded yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayPeople.map((person) => (
            <Link
              key={person.id}
              to={`${demoPrefix}/key-people`}
              className="w-full bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{person.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {relationshipLabel(person.relationship)}
                  {person.role ? ` · ${person.role}` : ''}
                </p>
                {person.notes && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {person.notes.split('\n')[0]}
                  </p>
                )}
              </div>
              {person.phone && (
                <a
                  href={`tel:${person.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:underline flex items-center gap-1 flex-shrink-0"
                  aria-label={`Call ${person.name}`}
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default KeyContactsWidget;
