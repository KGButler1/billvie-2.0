import { useMemo } from 'react';
import { Calendar, CheckCircle2, Clock, Link2 } from 'lucide-react';
import { DocumentLinkService } from '@/services/DocumentLinkService';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { EventExpenseService } from '@/services/EventExpenseService';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { DocumentService } from '@/services/DocumentService';
import { AccessService } from '@/services/AccessService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { KEY_PERSON_RELATIONSHIP_LABELS, KeyPersonRelationship } from '@/types/keyPerson';
import { TaxCategory } from '@/types/sharing';
import { AccessScope } from '@/types/people';
import { DOCUMENT_TYPE_LABELS } from '@/types/document';
import {
  Bill,
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  RECURRING_LABELS,
  BillCategory,
  PaymentMethod,
  RecurringInterval,
} from '@/types/bill';


const formatMoney = (amount?: number) =>
  amount === undefined || amount === null
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;

const label = <T extends string>(map: Record<T, string>, key?: string) =>
  key ? (map as Record<string, string>)[key] ?? key : undefined;

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h2>
    <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">{children}</div>
  </section>
);

const BillRow = ({ bill, viewerId }: { bill: Bill; viewerId?: string }) => {
  const meta = [
    bill.isRecurring
      ? label(RECURRING_LABELS as Record<RecurringInterval, string>, bill.recurringInterval)
      : formatDate(bill.dueDate) && `Due ${formatDate(bill.dueDate)}`,
    bill.notes || undefined,
    label(PAYMENT_METHOD_LABELS as Record<PaymentMethod, string>, bill.paymentMethod),
  ].filter(Boolean);

  const linkedDocId = DocumentLinkService.getLinkedDocumentIdForBill(bill.id);
  const linkedDoc = linkedDocId ? DocumentService.getAll().find((d) => d.id === linkedDocId) : undefined;
  const viewerCanSee =
    !!linkedDoc && (!viewerId || AccessService.canSee(viewerId, 'documents', linkedDoc.id));

  return (
    <div className="p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium truncate">{bill.name}</p>
        {meta.length > 0 && <p className="text-sm text-muted-foreground mt-0.5">{meta.join(' · ')}</p>}
        {linkedDoc && viewerCanSee && (
          <a
            href="/documents"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 inline-flex items-center gap-1 min-w-0"
          >
            <Link2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Linked to {linkedDoc.title}</span>
          </a>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold">{formatMoney(bill.amount)}</p>
        <p
          className={`text-xs mt-0.5 inline-flex items-center gap-1 ${
            bill.status === 'paid' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          {bill.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {bill.status === 'paid' ? 'Paid' : 'Pending'}
        </p>
      </div>
    </div>
  );
};

const BillsContent = ({ personId }: { personId?: string }) => {

  const bills = useMemo(() => BillService.getAllBills(), []);
  if (bills.length === 0) {
    return <p className="text-muted-foreground">Nothing has been added here yet.</p>;
  }

  const groups = bills.reduce<Record<string, Bill[]>>((acc, bill) => {
    const key = bill.category || 'other';
    (acc[key] ||= []).push(bill);
    return acc;
  }, {});

  return (
    <>
      {Object.entries(groups).map(([category, items]) => (
        <SectionCard key={category} title={label(CATEGORY_LABELS as Record<BillCategory, string>, category) || 'Other'}>
          {items.map((bill) => (
            <BillRow key={bill.id} bill={bill} viewerId={personId} />
          ))}
        </SectionCard>
      ))}
    </>
  );
};

const EventContent = ({ eventId }: { eventId?: string }) => {
  const event = useMemo(() => (eventId ? EventService.getEventById(eventId) : undefined), [eventId]);
  const expenses = useMemo(() => (event ? EventExpenseService.getExpenses(event.id) : []), [event]);

  if (!event) {
    return <p className="text-muted-foreground">This plan is no longer available.</p>;
  }

  const dates = [formatDate(event.startDate), formatDate(event.endDate)].filter(Boolean).join(' – ');

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{event.name}</h2>
        {dates && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {dates}
          </p>
        )}
      </div>
      <SectionCard title="Line items">
        {expenses.length === 0 ? (
          <p className="p-4 text-muted-foreground">No line items yet.</p>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium truncate">{expense.name}</p>
                {expense.vendor && <p className="text-sm text-muted-foreground mt-0.5">{expense.vendor}</p>}
                {expense.isCancellable !== 'no' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {expense.isCancellable === 'yes' ? 'Cancellable' : 'Cancellable: to be confirmed'}
                    {expense.cancellationNotes ? ` — ${expense.cancellationNotes}` : ''}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatMoney(expense.amount)}</p>
                <p className={`text-xs mt-0.5 ${expense.isPaid ? 'text-primary' : 'text-muted-foreground'}`}>
                  {expense.isPaid ? 'Paid' : 'Not paid yet'}
                </p>
              </div>
            </div>
          ))
        )}
      </SectionCard>
    </>
  );
};

const TaxContent = ({
  sharedCategories,
  sharedYears,
  documentId,
}: {
  sharedCategories?: TaxCategory[];
  sharedYears?: number[];
  documentId?: string;
}) => {
  const docs = useMemo(() => {
    let list = TaxDocumentService.getAllDocuments();
    if (documentId) return list.filter((d) => d.id === documentId);
    if (sharedCategories?.length) {
      list = list.filter((d) => d.categories?.some((c) => sharedCategories.includes(c)));
    }
    if (sharedYears?.length) {
      list = list.filter((d) => sharedYears.includes(d.year));
    }
    return list;
  }, [sharedCategories, sharedYears, documentId]);

  if (docs.length === 0) {
    return <p className="text-muted-foreground">No records have been shared here yet.</p>;
  }

  return (
    <SectionCard title="Records">
      {docs.map((doc) => (
        <div key={doc.id} className="p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium truncate">{doc.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[doc.categories?.join(', '), doc.year].filter(Boolean).join(' · ')}
            </p>
            {doc.notes && <p className="text-sm text-muted-foreground mt-1">{doc.notes}</p>}
          </div>
          <p className="font-semibold shrink-0">{formatMoney(doc.amount)}</p>
        </div>
      ))}
    </SectionCard>
  );
};

const DocumentsContent = ({ personId }: { personId?: string }) => {
  const docs = useMemo(
    () =>
      personId
        ? DocumentService.getAll().filter((d) => AccessService.canSee(personId, 'documents', d.id))
        : [],
    [personId]
  );

  if (docs.length === 0) {
    return <p className="text-muted-foreground">Nothing has been added here yet.</p>;
  }

  return (
    <SectionCard title="Important documents">
      {docs.map((doc) => (
        <div key={doc.id} className="p-4">
          <p className="font-medium">{doc.title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {[doc.provider, DOCUMENT_TYPE_LABELS[doc.type]].filter(Boolean).join(' · ')}
          </p>
          {doc.keyDetail && <p className="text-sm text-muted-foreground mt-1">{doc.keyDetail}</p>}
          {doc.notes && <p className="text-sm text-muted-foreground mt-1">{doc.notes}</p>}
        </div>
      ))}
    </SectionCard>
  );
};

// Address is never rendered here — it belongs to the household's own record.
const KeyPeopleContent = ({ personId }: { personId?: string }) => {
  const people = useMemo(
    () =>
      personId
        ? KeyPeopleService.getAllKeyPeople().filter((p) => AccessService.canSee(personId, 'key_people', p.id))
        : [],
    [personId]
  );

  if (people.length === 0) {
    return <p className="text-muted-foreground">Nothing has been added here yet.</p>;
  }

  return (
    <SectionCard title="Key contacts">
      {people.map((p) => (
        <div key={p.id} className="p-4">
          <p className="font-medium">{p.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {[
              KEY_PERSON_RELATIONSHIP_LABELS[p.relationship as KeyPersonRelationship] || String(p.relationship),
              p.role,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {p.phone && <p className="text-sm text-muted-foreground mt-1">{p.phone}</p>}
          {p.notes && <p className="text-sm text-muted-foreground mt-1">{p.notes}</p>}
        </div>
      ))}
    </SectionCard>
  );
};

const EventsContent = ({ eventId }: { eventId?: string }) => {
  const events = useMemo(
    () => (eventId ? [] : EventService.getAllEvents()),
    [eventId]
  );

  if (eventId) return <EventContent eventId={eventId} />;
  if (events.length === 0) {
    return <p className="text-muted-foreground">Nothing has been added here yet.</p>;
  }

  return (
    <>
      {events.map((event) => (
        <EventContent key={event.id} eventId={event.id} />
      ))}
    </>
  );
};

interface ShareContentPreviewProps {
  scope: AccessScope;
  personId?: string;
  resourceId?: string;
  sharedCategories?: TaxCategory[];
  sharedYears?: number[];
}

const ShareContentPreview = ({
  scope,
  personId,
  resourceId,
  sharedCategories,
  sharedYears,
}: ShareContentPreviewProps) => {
  if (scope === 'bills') return <BillsContent personId={personId} />;
  if (scope === 'events') return <EventsContent eventId={resourceId} />;
  if (scope === 'tax_documents')
    return <TaxContent sharedCategories={sharedCategories} sharedYears={sharedYears} documentId={resourceId} />;
  if (scope === 'documents') return <DocumentsContent personId={personId} />;
  if (scope === 'key_people') return <KeyPeopleContent personId={personId} />;
  return null;
};

export default ShareContentPreview;

