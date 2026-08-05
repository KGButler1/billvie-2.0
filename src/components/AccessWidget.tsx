import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { AccessService } from '@/services/AccessService';

const AccessWidget = () => {
  const navigate = useNavigate();
  const people = AccessService.getActivePeople();

  if (people.length === 0) {
    return (
      <button
        onClick={() => navigate('/people?invite=1')}
        className="w-full mb-6 p-4 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Household Access</p>
            <p className="text-xs text-muted-foreground">No one else can see any of this yet.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => navigate('/people')}
        className="flex items-center justify-between w-full mb-3"
      >
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Household Access</h2>
        <span className="text-xs text-primary flex items-center gap-1">
          View all ({people.length}) <ChevronRight className="w-3 h-3" />
        </span>
      </button>
      <div className="space-y-2">
        {people.slice(0, 3).map((person) => (
          <button
            key={person.id}
            onClick={() => navigate('/people')}
            className="w-full bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
          >
            <Users className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{person.name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{person.role}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AccessWidget;
