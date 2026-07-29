import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Info, ArrowRight } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { Button } from '@/components/ui/button';
import { SharingService } from '@/services/SharingService';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { EventExpenseService } from '@/services/EventExpenseService';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { Share } from '@/types/sharing';
import {
  Bill,
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  RECURRING_LABELS,
  RESPONSIBLE_PARTY_LABELS,
  BillCategory,
  PaymentMethod,
  RecurringInterval,
  ResponsibleParty,
} from '@/types/bill';

const formatMoney = (amount?: number) =>
  amount === undefined || amount === null
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;

const label = <T extends string>(map: Record<T, string>, key?: string) =>
  key ? (map as Record<string, string>)[key] ?? key : undefined;

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border">
      <div className="max-w-3xl mx-auto px-5 py-4 flex items-center">
        <BillvieLogo size="sm" />
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-5 py-8 pb-16">{children}</main>
  </div>
);

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h2>
    <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">{children}</div>
  </section>
);

const BillRow = ({ bill }: { bill: Bill }) => {
  const meta = [
    bill.isRecurring
      ? label(RECURRING_LABELS as Record<RecurringInterval, string>, bill.recurringInterval)
      : formatDate(bill.dueDate) && `Due ${formatDate(bill.dueDate)}`,
    label(RESPONSIBLE_PARTY_LABELS as Record<ResponsibleParty, string>, bill.responsibleParty),
    label(PAYMENT_METHOD_LABELS as Record<PaymentMethod, string>, bill.paymentMethod),
  ].filter(Boolean);

  return (
    <div className="p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium truncate">{bill.name}</p>
        {meta.length > 0 && <p className="text-sm text-muted-foreground mt-0.5">{meta.join(' · ')}</p>}
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

const BillsContent = () => {
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
            <BillRow key={bill.id} bill={bill} />
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

const TaxContent = ({ share }: { share: Share }) => {
  const docs = useMemo(() => {
    let list = TaxDocumentService.getAllDocuments();
    if (share.sharedCategories?.length) {
      list = list.filter((d) => d.categories?.some((c) => share.sharedCategories!.includes(c)));
    }
    if (share.sharedYears?.length) {
      list = list.filter((d) => share.sharedYears!.includes(d.year));
    }
    return list;
  }, [share]);

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

const SharedView = () => {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<Share | undefined>(() =>
    token ? SharingService.getShareByToken(token) : undefined
  );
  const [accepted, setAccepted] = useState(share?.status === 'accepted');

  useEffect(() => {
    if (share && share.status === 'accepted') {
      SharingService.addActivityLog(share.id, 'Viewed', share.sharedWithEmail, share.sharedWithName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share?.id]);

  if (!share) {
    return (
      <Shell>
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold mb-2">This link isn't valid</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            This link isn't valid, or access may have been removed. If you were expecting to see something here, ask the
            person who shared it to send a fresh link.
          </p>
        </div>
      </Shell>
    );
  }

  const sharerName = share.sharedWithName && share.ownerId !== 'current_user' ? share.ownerId : 'Someone';
  const resourceName = share.resourceName || 'their household';

  const handleAccept = () => {
    const updated = SharingService.acceptShare(share.id);
    if (updated) setShare(updated);
    setAccepted(true);
  };

  if (!accepted) {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
          <h1 className="text-2xl md:text-3xl font-semibold mb-3">
            {sharerName} shared {resourceName} with you
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Billvie is where families keep track of what's owed and what's coming up, together.
          </p>
          <Button size="lg" onClick={handleAccept}>
            Accept &amp; View
          </Button>
        </motion.div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{resourceName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Shared with you by {sharerName}</p>
      </div>

      {share.permission === 'edit' && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Full editing is coming soon — for now this is a read-only view.</p>
        </div>
      )}

      {share.type === 'bills' && <BillsContent />}
      {share.type === 'event' && <EventContent eventId={share.resourceId} />}
      {share.type === 'tax_documents' && <TaxContent share={share} />}

      <footer className="mt-12 pt-8 border-t border-border text-center">
        <p className="text-muted-foreground mb-3">Want this kind of visibility into your own household?</p>
        <Link to="/onboarding" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          Get started with Billvie
          <ArrowRight className="w-4 h-4" />
        </Link>
      </footer>
    </Shell>
  );
};

export default SharedView;
