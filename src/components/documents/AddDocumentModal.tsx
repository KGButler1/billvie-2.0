import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentType, DOCUMENT_TYPE_LABELS, HouseholdDocument } from '@/types/document';
import AccessPicker from '@/components/people/AccessPicker';
import { PersonTagPicker } from '@/components/people/PersonTags';

import { PeopleService } from '@/services/PeopleService';

interface AddDocumentModalProps {
  onAdd: (
    doc: Omit<HouseholdDocument, 'id' | 'createdAt' | 'updatedAt'>,
    personIds: string[]
  ) => void;
  onClose: () => void;
}

const AddDocumentModal = ({ onAdd, onClose }: AddDocumentModalProps) => {
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [type, setType] = useState<DocumentType>('insurance');
  const [keyDetail, setKeyDetail] = useState('');
  const [notes, setNotes] = useState('');
  // Sharing with family is the product's purpose; sending something to your
  // accountant is a decision.
  const [householdIds, setHouseholdIds] = useState<string[]>(() =>
    PeopleService.getAll().filter((p) => p.role === 'household').map((p) => p.id)
  );
  const [professionalIds, setProfessionalIds] = useState<string[]>([]);
  const [taggedPersonIds, setTaggedPersonIds] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(
      {
        title: title.trim(),
        provider: provider.trim(),
        type,
        keyDetail: keyDetail.trim() || undefined,
        notes: notes.trim() || undefined,
        taggedPersonIds: taggedPersonIds.length ? taggedPersonIds : undefined,
      },

      [...householdIds, ...professionalIds]
    );
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
            <h2 className="text-lg font-semibold">Add something important</h2>
            <p className="text-sm text-muted-foreground">Include anything someone else might need to know</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">What is it?</label>
            <Input
              placeholder="e.g. Home Insurance, Super Fund"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Provider or institution</label>
            <Input
              placeholder="e.g. Allianz, AustralianSuper"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Type</label>
            <Select value={type} onValueChange={(v) => setType(v as DocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Key detail <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Policy #, Account reference"
              value={keyDetail}
              onChange={(e) => setKeyDetail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Just enough to be useful — no sensitive credentials needed</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Notes & instructions <span className="text-muted-foreground font-normal">(important)</span>
            </label>
            <Textarea
              placeholder="What should someone know about this? e.g. 'Auto-renews in March, call to cancel'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">This helps someone step in if needed</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Who can see this?</label>
            <AccessPicker
              scope="documents"
              roleFilter="household"
              selectedPersonIds={householdIds}
              onChange={setHouseholdIds}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Your advisor or accountant</label>
            <AccessPicker
              scope="documents"
              roleFilter="professional"
              selectedPersonIds={professionalIds}
              onChange={setProfessionalIds}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">For someone in particular?</label>
            <PersonTagPicker
              value={taggedPersonIds}
              onChange={setTaggedPersonIds}
              scope="documents"
            />
          </div>


          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
            <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">No sensitive credentials stored. Only you and people you invite can see this.</p>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!title.trim()}>
            Add to household records
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddDocumentModal;
