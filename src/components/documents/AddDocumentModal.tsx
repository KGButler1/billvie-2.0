import { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentType, DOCUMENT_TYPE_LABELS, HouseholdDocument } from '@/types/document';
import AccessPicker from '@/components/people/AccessPicker';
import { PersonTagPicker } from '@/components/people/PersonTags';

import { PeopleService } from '@/services/PeopleService';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { BillService } from '@/services/BillService';
import { FinancialInfoService, InsuranceEntry, SuperannuationEntry } from '@/services/FinancialInfoService';
import LinkPicker, { LinkPickerOption } from '@/components/shared/LinkPicker';
import TaxRelevanceFields, {
  TaxRelevanceValue,
  emptyTaxRelevance,
} from '@/components/tax/TaxRelevanceFields';
import { TaxTagService } from '@/services/TaxTagService';
import AttachmentManager from '@/components/documents/AttachmentManager';
import FieldError from '@/components/ui/field-error';

interface AddDocumentModalProps {
  document?: HouseholdDocument;
  scrollToWhereToFindIt?: boolean;
  onAdd: (
    doc: Omit<HouseholdDocument, 'id' | 'createdAt' | 'updatedAt'>,
    personIds: string[],
    linkedBillId?: string,
    tax?: TaxRelevanceValue,
    linkedFinancialEntry?: { type: 'insurance' | 'super'; id: string }
  ) => void;
  onEdit: (id: string, updates: Partial<HouseholdDocument>, tax?: TaxRelevanceValue) => void;
  onClose: () => void;
}

const AddDocumentModal = ({ document, scrollToWhereToFindIt, onAdd, onEdit, onClose }: AddDocumentModalProps) => {
  const [title, setTitle] = useState(document?.title ?? '');
  const [provider, setProvider] = useState(document?.provider ?? '');
  const [type, setType] = useState<DocumentType>(document?.type ?? 'insurance');
  const [keyDetail, setKeyDetail] = useState(document?.keyDetail ?? '');
  const [notes, setNotes] = useState(document?.notes ?? '');
  const [importantDate, setImportantDate] = useState(document?.importantDate ?? '');
  const [importantDateLabel, setImportantDateLabel] = useState(document?.importantDateLabel ?? '');
  // Sharing with family is the product's purpose; sending something to your
  // accountant is a decision.
  const [householdIds, setHouseholdIds] = useState<string[]>(() =>
    PeopleService.getAll().filter((p) => p.role === 'household').map((p) => p.id)
  );
  const [professionalIds, setProfessionalIds] = useState<string[]>([]);
  const [taggedPersonIds, setTaggedPersonIds] = useState<string[]>([]);

  const [tax, setTax] = useState<TaxRelevanceValue>(() => {
    const base = emptyTaxRelevance();
    if (!document) return base;
    const existing = TaxTagService.getTagForItem(document.id, 'document', base.taxYear);
    return existing
      ? {
          enabled: true,
          taxYear: existing.taxYear,
          taxType: existing.taxType ?? 'personal',
          businessName: existing.businessName,
        }
      : base;
  });

  const [externalLink, setExternalLink] = useState(document?.externalLink ?? '');
  const [physicalLocation, setPhysicalLocation] = useState(document?.physicalLocation ?? '');
  const whereToFindItRef = useRef<HTMLDivElement>(null);
  const [titleError, setTitleError] = useState('');

  const [linkedBill, setLinkedBill] = useState<LinkPickerOption | null>(() => {
    if (!document) return null;
    const billId = DocumentLinkService.getLinkedBillId(document.id);
    const bill = billId ? BillService.getBillById(billId) : undefined;
    return bill ? { id: bill.id, label: bill.name } : null;
  });

  const billOptions = useMemo(
    () => BillService.getAllBills().map((b) => ({ id: b.id, label: b.name })),
    []
  );

  const handleLinkedBillChange = async (option: LinkPickerOption | null) => {
    setLinkedBill(option);
    if (!document) return; // create mode: applied after save via onAdd instead

    if (option) {
      await DocumentLinkService.linkToBill(document.id, option.id);
    } else {
      const currentBillId = DocumentLinkService.getLinkedBillId(document.id);
      if (currentBillId) {
        const linkId = DocumentLinkService.findActiveLinkId(document.id, currentBillId);
        if (linkId) await DocumentLinkService.unlink(linkId);
      }
    }
  };

  const handleCreateBill = async (name: string): Promise<LinkPickerOption> => {
    const created = await BillService.addBill({ name, isRecurring: false });
    return { id: created.id, label: created.name };
  };

  // ---- Financial Snapshot reverse link ----
  // For insurance/investment/account/superannuation documents, offer linking
  // to (or creating) a matching Financial Snapshot entry.
  const FINANCIAL_DOC_TYPES: DocumentType[] = ['insurance', 'investment', 'account', 'superannuation'];

  const financialEntryType = (dt: DocumentType): 'insurance' | 'super' =>
    dt === 'insurance' ? 'insurance' : 'super';

  const [linkedFinancial, setLinkedFinancial] = useState<LinkPickerOption | null>(() => {
    if (!document || !FINANCIAL_DOC_TYPES.includes(document.type)) return null;
    const et = financialEntryType(document.type);
    const entries = et === 'insurance' ? FinancialInfoService.getInsurance() : FinancialInfoService.getSuperannuation();
    const match = entries.find((e) => e.linkedDocumentId === document.id);
    return match ? { id: e.id, label: et === 'insurance' ? (e as InsuranceEntry).provider : (e as SuperannuationEntry).fundName } : null;
  });

  const financialOptions = useMemo(() => {
    if (!FINANCIAL_DOC_TYPES.includes(type)) return [];
    const et = financialEntryType(type);
    const entries = et === 'insurance' ? FinancialInfoService.getInsurance() : FinancialInfoService.getSuperannuation();
    return entries.map((e) => ({
      id: e.id,
      label: et === 'insurance' ? (e as InsuranceEntry).provider : (e as SuperannuationEntry).fundName,
    }));
  }, [type]);

  const handleCreateFinancial = async (name: string): Promise<LinkPickerOption> => {
    const et = financialEntryType(type);
    if (et === 'insurance') {
      const created = await FinancialInfoService.addInsurance({
        provider: name,
        type: 'other',
        linkedDocumentId: document?.id,
      });
      return { id: created.id, label: created.provider };
    } else {
      const created = await FinancialInfoService.addSuperannuation({
        fundName: name,
        estimatedBalance: 0,
        linkedDocumentId: document?.id,
      });
      return { id: created.id, label: created.fundName };
    }
  };

  const handleLinkedFinancialChange = async (option: LinkPickerOption | null) => {
    setLinkedFinancial(option);
    if (!document) return; // create mode: applied after save

    // Unlink previous entry
    const et = financialEntryType(document.type);
    const entries = et === 'insurance' ? FinancialInfoService.getInsurance() : FinancialInfoService.getSuperannuation();
    const previous = entries.find((e) => e.linkedDocumentId === document.id);
    if (previous && previous.id !== option?.id) {
      if (et === 'insurance') {
        await FinancialInfoService.updateInsurance(previous.id, { linkedDocumentId: undefined });
      } else {
        await FinancialInfoService.updateSuperannuation(previous.id, { linkedDocumentId: undefined });
      }
    }

    if (option) {
      if (et === 'insurance') {
        await FinancialInfoService.updateInsurance(option.id, { linkedDocumentId: document.id });
      } else {
        await FinancialInfoService.updateSuperannuation(option.id, { linkedDocumentId: document.id });
      }
    }
  };

  // Scroll to the where-to-find-it section if requested (e.g. after creating a doc).
  useEffect(() => {
    if (scrollToWhereToFindIt && whereToFindItRef.current) {
      whereToFindItRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToWhereToFindIt]);

  const handleSubmit = () => {
    if (!title.trim()) { setTitleError('Give this document a title.'); return; }

    const shared = {
      title: title.trim(),
      provider: provider.trim(),
      type,
      keyDetail: keyDetail.trim() || undefined,
      notes: notes.trim() || undefined,
      importantDate: importantDate || undefined,
      importantDateLabel: importantDateLabel.trim() || undefined,
      taggedPersonIds: taggedPersonIds.length ? taggedPersonIds : undefined,
      attachment: undefined,
      externalLink: externalLink.trim() || undefined,
      physicalLocation: physicalLocation.trim() || undefined,
    };

    if (document) {
      onEdit(document.id, shared, tax);
    } else {
      const linkedFinancialEntry = linkedFinancial
        ? { type: financialEntryType(type) as 'insurance' | 'super', id: linkedFinancial.id }
        : undefined;
      onAdd(shared, [...householdIds, ...professionalIds], linkedBill?.id, tax, linkedFinancialEntry);
    }
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
            <h2 className="text-lg font-semibold">{document ? 'Edit document' : 'Add something important'}</h2>
            {!document && (
              <p className="text-sm text-muted-foreground">Include anything someone else might need to know</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">What is it? <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Input
              placeholder="e.g. Home Insurance, Super Fund"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
              className={titleError ? 'border-destructive' : undefined}
              autoFocus
            />
            <FieldError message={titleError} />
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
            {type === 'other' && (
              <p className="text-xs text-muted-foreground mt-1">
                e.g. a classic car, jewelry, or family heirloom — note what it's worth so it isn't
                given away by accident.
              </p>
            )}
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
              Important date <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={importantDate}
                onChange={(e) => setImportantDate(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Expires, Renews, Term ends..."
                value={importantDateLabel}
                onChange={(e) => setImportantDateLabel(e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For anything with an expiry or renewal — a passport, a fixed-term policy, a lease
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Linked bill <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <LinkPicker
              triggerLabel="Link a bill"
              emptyLabel="No bills yet — type a name to create one"
              createLabel={(q) => `Create bill: ${q}`}
              options={billOptions}
              value={linkedBill}
              onChange={handleLinkedBillChange}
              onCreate={handleCreateBill}
              initialQuery={title}
              chipIcon={Link2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              For things like an insurance premium or contribution this document represents
            </p>
          </div>


          {FINANCIAL_DOC_TYPES.includes(type) && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Financial Snapshot entry <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <LinkPicker
                triggerLabel="Link to a Financial Snapshot entry"
                emptyLabel="No entries yet — type a name to create one"
                createLabel={(q) => `Create entry: ${q}`}
                options={financialOptions}
                value={linkedFinancial}
                onChange={handleLinkedFinancialChange}
                onCreate={handleCreateFinancial}
                initialQuery={title}
                chipIcon={Link2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Connect this document to the matching entry in Financial Snapshot
              </p>
            </div>
          )}

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

          <div ref={whereToFindItRef}>
            <label className="text-sm font-medium block mb-2">
              Where to find it <span className="text-muted-foreground font-normal">(optional)</span>
            </label>

            {document && (
              <div className="mb-3">
                <AttachmentManager ownerType="document" ownerId={document.id} />
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Link2 className="w-3.5 h-3.5" /> Link to it
                </div>
                <Input
                  placeholder="https://..."
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="text-xs">or just say where it is</span>
                </div>
                <Input
                  placeholder="e.g. Fireproof box in the study, top shelf"
                  value={physicalLocation}
                  onChange={(e) => setPhysicalLocation(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <TaxRelevanceFields value={tax} onChange={setTax} />
            <p className="text-xs text-muted-foreground mt-1.5">
              This shows up in Tax Documents for that year — the document itself doesn't change.
            </p>
          </div>

          {!document && (
            <>
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
            </>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">For someone in particular?</label>
            <PersonTagPicker
              value={taggedPersonIds}
              onChange={setTaggedPersonIds}
              scope="documents"
            />
          </div>


          {!document && (
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
              <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">No sensitive credentials stored. Only you and people you invite can see this.</p>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full">
            {document ? 'Save changes' : 'Add to household records'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddDocumentModal;
