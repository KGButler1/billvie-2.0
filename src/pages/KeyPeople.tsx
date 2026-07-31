import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Phone, Pencil, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { PeopleService } from '@/services/PeopleService';
import { AccessService } from '@/services/AccessService';
import { KeyPerson, KEY_PERSON_RELATIONSHIP_LABELS, KeyPersonRelationship } from '@/types/keyPerson';
import KeyPersonModal from '@/components/keypeople/KeyPersonModal';
import BottomNav from '@/components/BottomNav';

const relationshipLabel = (value: string) =>
  KEY_PERSON_RELATIONSHIP_LABELS[value as KeyPersonRelationship] ?? value;

const KeyPeople = () => {
  const [people, setPeople] = useState<KeyPerson[]>(() => KeyPeopleService.getAllKeyPeople());
  const [searchParams] = useSearchParams();
  const [isAdding, setIsAdding] = useState(() => searchParams.get('add') === '1');
  const [editing, setEditing] = useState<KeyPerson | null>(null);

  const reload = () => setPeople(KeyPeopleService.getAllKeyPeople());

  const handleSave = (data: Omit<KeyPerson, 'id' | 'createdAt' | 'updatedAt'>, personIds: string[]) => {
    const id = editing ? (KeyPeopleService.updateKeyPerson(editing.id, data), editing.id)
                       : KeyPeopleService.addKeyPerson(data).id;
    const household = PeopleService.getAll().filter((p) => p.role === 'household');
    household.forEach((p) => {
      if (personIds.includes(p.id)) AccessService.grantItem(p.id, 'key_people', id);
      else AccessService.revokeScopeForPerson(p.id, 'key_people', id);
    });
    reload();
    setIsAdding(false);
    setEditing(null);
  };

  const handleDelete = (person: KeyPerson) => {
    if (confirm(`Remove ${person.name} from your key people?`)) {
      KeyPeopleService.deleteKeyPerson(person.id);
      reload();
    }
  };

  const viewersFor = (person: KeyPerson) =>
    AccessService.getPeopleFor('key_people', person.id).map((p) => p.name.trim().split(' ')[0]);


  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Key People</h1>
          <Button size="sm" onClick={() => setIsAdding(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 max-w-2xl">
        <div className="hidden lg:flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Key People</h1>
          <Button size="sm" onClick={() => setIsAdding(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {people.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Who would they call?</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add the people who'd need to know — who to call, who holds a key, who knows the plan.
            </p>
            <Button onClick={() => setIsAdding(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add someone important
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {people.map((person, i) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{person.name}</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {relationshipLabel(person.relationship)}
                      </span>
                    </div>
                    {person.role && (
                      <p className="text-sm text-muted-foreground mt-1">{person.role}</p>
                    )}
                    {person.phone && (
                      <a
                        href={`tel:${person.phone}`}
                        className="text-sm text-primary mt-1 inline-flex items-center gap-1.5 hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" /> {person.phone}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleVisibility(person)}
                      title={person.visibility === 'shared' ? 'Visible to shared members' : 'Private to you'}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                    >
                      {person.visibility === 'shared'
                        ? <Eye className="w-4 h-4 text-primary" />
                        : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditing(person)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(person)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {(isAdding || editing) && (
          <KeyPersonModal
            person={editing ?? undefined}
            onSave={handleSave}
            onClose={() => { setIsAdding(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default KeyPeople;
