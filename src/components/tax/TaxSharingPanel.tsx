import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccessService } from '@/services/AccessService';
import { TrustedPerson } from '@/types/people';
import TaxAccessSheet from '@/components/tax/TaxAccessSheet';

export const TaxSharingPanel = () => {
  const [people, setPeople] = useState<TrustedPerson[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const reload = () => setPeople(AccessService.getPeopleWithAccessTo('tax_documents'));

  useEffect(() => {
    reload();
  }, []);

  const sheet = (
    <AnimatePresence>
      {isOpen && (
        <TaxAccessSheet
          title="All tax documents"
          onClose={() => {
            setIsOpen(false);
            reload();
          }}
        />
      )}
    </AnimatePresence>
  );

  if (people.length === 0) {
    return (
      <>
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
          <Button variant="outline" className="w-full" onClick={() => setIsOpen(true)}>
            Choose who can see this
          </Button>
        </div>
        {sheet}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
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
            <p className="text-sm text-muted-foreground">Tap to change who</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </button>
      {sheet}
    </>
  );
};
