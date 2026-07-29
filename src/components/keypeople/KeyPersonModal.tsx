import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { KeyPerson, KEY_PERSON_RELATIONSHIP_LABELS, KeyPersonRelationship } from '@/types/keyPerson';

interface KeyPersonModalProps {
  person?: KeyPerson;
  defaults?: Partial<Pick<KeyPerson, 'name' | 'email'>>;
  onSave: (person: Omit<KeyPerson, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const KeyPersonModal = ({ person, defaults, onSave, onClose }: KeyPersonModalProps) => {
  const [name, setName] = useState(person?.name ?? defaults?.name ?? '');
  const [relationship, setRelationship] = useState<string>(person?.relationship ?? 'spouse');
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [role, setRole] = useState(person?.role ?? '');
  const [email, setEmail] = useState(person?.email ?? defaults?.email ?? '');
  const [address, setAddress] = useState(person?.address ?? '');
  const [notes, setNotes] = useState(person?.notes ?? '');
  const [emailWarning, setEmailWarning] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'shared'>(person?.visibility ?? 'private');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      relationship,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      role: role.trim(),
      visibility,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">{person ? 'Edit person' : 'Add someone important'}</h2>
            <p className="text-sm text-muted-foreground">Who they are, and why someone would call them</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name</label>
            <Input
              placeholder="e.g. Sarah Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Relationship</label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KEY_PERSON_RELATIONSHIP_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Phone <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              placeholder="e.g. 0412 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Why they matter</label>
            <Input
              placeholder="e.g. Holds a spare key, Has power of attorney"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">The reason someone would need to call them</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Email <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              placeholder="e.g. sarah@example.com"
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailWarning(!!email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))}
            />
            {emailWarning && (
              <p className="text-xs text-muted-foreground mt-1">That doesn't look like an email address.</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Address <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input placeholder="e.g. 12 Grove St, Melbourne" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              rows={2}
              placeholder="Anything someone would want to know about them"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>



          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Visible to shared members</p>
              <p className="text-xs text-muted-foreground">People you've invited can see this</p>
            </div>
            <Switch
              checked={visibility === 'shared'}
              onCheckedChange={(checked) => setVisibility(checked ? 'shared' : 'private')}
            />
          </div>

          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
            <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Only you and people you invite can see this.</p>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!name.trim()}>
            {person ? 'Save changes' : 'Add to key people'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default KeyPersonModal;
