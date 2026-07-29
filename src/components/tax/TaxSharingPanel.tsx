import { useEffect, useState } from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AccessService } from '@/services/AccessService';
import { TrustedPerson } from '@/types/people';

export const TaxSharingPanel = () => {
  const navigate = useNavigate();
  const [people, setPeople] = useState<TrustedPerson[]>([]);

  useEffect(() => {
    setPeople(AccessService.getPeopleWithAccessTo('tax_documents'));
  }, []);

  if (people.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">No one can see your tax documents yet</h3>
            <p className="text-sm text-muted-foreground">Your accountant or someone you trust could.</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={() => navigate('/people')}>
          Choose who can see this
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate('/people')}
      className="w-full text-left bg-card rounded-xl border border-border p-4 mb-6 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {people.map((p) => p.name).join(', ')} can see your tax documents
          </p>
          <p className="text-sm text-muted-foreground">Change this on Trusted People</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </button>
  );
};
