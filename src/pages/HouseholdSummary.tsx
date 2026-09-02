import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { EventExpenseService } from '@/services/EventExpenseService';
import { DocumentService } from '@/services/DocumentService';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';

import { ACCESS_SCOPE_LABELS } from '@/types/people';
import {
  FinancialInfoService,
  INSURANCE_TYPE_LABELS,
  DEBT_TYPE_LABELS,
} from '@/services/FinancialInfoService';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency, formatFrequency } from '@/utils/currency';
import { DOCUMENT_TYPE_LABELS } from '@/types/document';
import UpgradeModal from '@/components/UpgradeModal';

const titleCase = (s?: string) =>
  s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-lg font-semibold border-b border-border pb-1 mb-3">{title}</h2>
    {children}
  </section>
);

const Empty = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground">{text}</p>
);

const HouseholdSummary = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const isPaid = profile?.isPaid ?? false;
  const [showUpgradeModal, setShowUpgradeModal] = useState(!isPaid);

  const bills = BillService.getAllBills();
  const billsByCategory = bills.reduce<Record<string, typeof bills>>((acc, bill) => {
    const key = bill.category || 'other';
    (acc[key] = acc[key] || []).push(bill);
    return acc;
  }, {});

  const events = EventService.getAllEvents().filter(
    (e) => e.status === 'planning' || e.status === 'active'
  );

  const insurance = FinancialInfoService.getInsurance();
  const superannuation = FinancialInfoService.getSuperannuation();
  const income = FinancialInfoService.getIncome();
  const debts = FinancialInfoService.getDebts();
  const misc = FinancialInfoService.getMisc();

  const documents = DocumentService.getAll();
  const documentViewers = (id: string) => {
    const names = AccessService.getPeopleFor('documents', id).map((p) => p.name);
    return names.length > 0 ? `Visible to: ${names.join(', ')}` : 'Visible to: no one yet';
  };

  const peopleWithAccess = AccessService.getActivePeople().map((p) => ({
    name: p.name,
    scopes: AccessService.getGrantsForPerson(p.id).map((g) => ACCESS_SCOPE_LABELS[g.scope].toLowerCase()),
  }));

  if (!isPaid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Household Summary</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          A printable report your family or executor could pick up and understand.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button onClick={() => setShowUpgradeModal(true)}>See Plan</Button>
        </div>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reason="household_summary"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1">Household Summary</h1>
          <Button onClick={() => window.print()} size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <main className="print-summary container mx-auto px-6 py-8 max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Household Summary</h1>
          <p className="text-sm text-muted-foreground">
            Generated {formatDate(new Date().toISOString())}
          </p>
        </header>

        <Section title="Bills">
          {bills.length === 0 ? (
            <Empty text="No bills recorded." />
          ) : (
            <div className="space-y-5">
              {Object.entries(billsByCategory).map(([category, catBills]) => {
                const subtotal = catBills.reduce((sum, b) => sum + (b.amount || 0), 0);
                return (
                  <div key={category}>
                    <h3 className="font-medium mb-1">{titleCase(category)}</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="font-normal py-1">Bill</th>
                          <th className="font-normal py-1">Amount</th>
                          <th className="font-normal py-1">Frequency</th>
                          <th className="font-normal py-1">Who</th>
                          <th className="font-normal py-1">Paid by</th>
                          <th className="font-normal py-1">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catBills.map((b) => (
                          <tr key={b.id} className="border-t border-border/60">
                            <td className="py-1">{b.name}</td>
                            <td className="py-1">{formatCurrency(b.amount)}</td>
                            <td className="py-1">
                              {b.isRecurring ? titleCase(b.recurringInterval) : 'One time'}
                            </td>
                            <td className="py-1">
                              {(b.taggedPersonIds ?? [])
                                .map((id) => PeopleService.getById(id)?.name)
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </td>

                            <td className="py-1">{titleCase(b.paymentMethod)}</td>
                            <td className="py-1">{titleCase(b.status)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-border font-medium">
                          <td className="py-1">Subtotal</td>
                          <td className="py-1" colSpan={5}>
                            {formatCurrency(subtotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Events">
          {events.length === 0 ? (
            <Empty text="No active or upcoming events." />
          ) : (
            <div className="space-y-5">
              {events.map((event) => {
                const expenses = EventExpenseService.getExpenses(event.id);
                const committed = expenses.reduce((s, e) => s + e.amount, 0);
                const paid = expenses.filter((e) => e.isPaid).reduce((s, e) => s + e.amount, 0);
                return (
                  <div key={event.id}>
                    <h3 className="font-medium">
                      {event.name}{' '}
                      <span className="text-muted-foreground font-normal">
                        ({titleCase(event.type)})
                      </span>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(event.startDate)} – {formatDate(event.endDate)} · Committed{' '}
                      {formatCurrency(committed)} · Paid {formatCurrency(paid)}
                    </p>
                    {expenses.length > 0 && (
                      <ul className="mt-2 text-sm space-y-1">
                        {expenses.map((e) => (
                          <li key={e.id} className="border-t border-border/60 pt-1">
                            {e.name}
                            {e.vendor ? ` — ${e.vendor}` : ''} · {formatCurrency(e.amount)} ·{' '}
                            {e.isPaid ? 'Paid' : 'Not paid'}
                            {e.isCancellable !== 'no' && (
                              <span className="text-muted-foreground">
                                {' '}
                                · Cancellable: {e.isCancellable === 'yes' ? 'Yes' : 'TBD'}
                                {e.cancellationNotes ? ` (${e.cancellationNotes})` : ''}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Financial Snapshot">
          <div className="space-y-5 text-sm">
            <div>
              <h3 className="font-medium mb-1">Insurance</h3>
              {insurance.length === 0 ? (
                <Empty text="None recorded." />
              ) : (
                <ul className="space-y-1">
                  {insurance.map((i) => {
                    const bill = i.linkedBillId ? BillService.getBillById(i.linkedBillId) : undefined;
                    const cost = bill
                      ? `${formatCurrency(bill.amount)}${bill.recurringInterval ? ` ${bill.recurringInterval.replace('_', ' ')}` : ''}`
                      : i.premium !== undefined
                        ? `${formatCurrency(i.premium)}${i.premiumFrequency ? ` ${i.premiumFrequency}` : ''}`
                        : null;
                    return (
                      <li key={i.id} className="border-t border-border/60 pt-1">
                        {i.provider} — {INSURANCE_TYPE_LABELS[i.type]}
                        {cost
                          ? ` · ${cost}`
                          : i.contactInfo
                            ? ` · Contact: ${i.contactInfo}`
                            : ''}
                        {i.renewalDate ? ` · Renews ${formatDate(i.renewalDate)}` : ''}
                        {i.notes ? ` · ${i.notes}` : ''}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-1">Savings &amp; Retirement</h3>
              {superannuation.length === 0 ? (
                <Empty text="None recorded." />
              ) : (
                <ul className="space-y-1">
                  {superannuation.map((s) => (
                    <li key={s.id} className="border-t border-border/60 pt-1">
                      {s.fundName} · {formatCurrency(s.estimatedBalance)}
                      {s.contactInfo ? ` · Contact: ${s.contactInfo}` : ''}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-1">Income Sources</h3>
              {income.length === 0 ? (
                <Empty text="None recorded." />
              ) : (
                <ul className="space-y-1">
                  {income.map((i) => (
                    <li key={i.id} className="border-t border-border/60 pt-1">
                      {i.sourceName} · {formatCurrency(i.approximateAmount)}{formatFrequency(i.frequency)}
                      {i.notes ? ` · ${i.notes}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-1">Debts &amp; Loans</h3>
              {debts.length === 0 ? (
                <Empty text="None recorded." />
              ) : (
                <ul className="space-y-1">
                  {debts.map((d) => (
                    <li key={d.id} className="border-t border-border/60 pt-1">
                      {d.owedTo} — {DEBT_TYPE_LABELS[d.type]} · {formatCurrency(d.approximateBalance)}
                      {d.notes ? ` · ${d.notes}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {misc.length > 0 && (
              <div>
                <h3 className="font-medium mb-1">Other Notes</h3>
                <ul className="space-y-1">
                  {misc.map((m) => (
                    <li key={m.id} className="border-t border-border/60 pt-1">
                      {m.key}: {m.value}
                      {m.notes ? ` · ${m.notes}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>

        <Section title="Important Documents">
          {documents.length === 0 ? (
            <Empty text="No documents recorded." />
          ) : (
            <ul className="text-sm space-y-1">
              {documents.map((d) => (
                <li key={d.id} className="border-t border-border/60 pt-1">
                  <span className="font-medium">{d.title}</span> — {d.provider} ·{' '}
                  {DOCUMENT_TYPE_LABELS[d.type]}
                  {d.keyDetail ? ` · ${d.keyDetail}` : ''}
                  {d.notes ? ` · ${d.notes}` : ''}
                  {d.physicalLocation ? ` · Original in ${d.physicalLocation}` : ''}
                  {d.externalLink ? ` · ${d.externalLink}` : ''}
                  <div className="text-xs text-muted-foreground">{documentViewers(d.id)}</div>
                </li>
              ))}


            </ul>
          )}
        </Section>

        <Section title="Who already has access">
          {peopleWithAccess.length === 0 ? (
            <Empty text="No one else has access yet." />
          ) : (
            <ul className="text-sm space-y-1">
              {peopleWithAccess.map((p) => (
                <li key={p.name}>
                  <span className="font-medium">{p.name}</span> — {p.scopes.join(', ')}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          Generated from Billvie. No passwords or account credentials are included in this summary.
        </footer>
      </main>
    </div>
  );
};

export default HouseholdSummary;
