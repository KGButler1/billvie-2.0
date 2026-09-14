import JSZip from 'jszip';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { DocumentService } from '@/services/DocumentService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { PeopleService } from '@/services/PeopleService';
import { AccessService } from '@/services/AccessService';
import { PaymentCardService } from '@/services/PaymentCardService';
import { BankAccountService } from '@/services/BankAccountService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { refreshAllData } from '@/services/loadAllData';
import { arrayToCSV, CSVColumn } from '@/utils/csvExport';

export interface ExportData {
  exportedAt: string;
  bills: ReturnType<typeof BillService.getAllBills>;
  events: ReturnType<typeof EventService.getAllEvents>;
  documents: ReturnType<typeof DocumentService.getAll>;
  insurance: ReturnType<typeof FinancialInfoService.getInsurance>;
  superannuation: ReturnType<typeof FinancialInfoService.getSuperannuation>;
  income: ReturnType<typeof FinancialInfoService.getIncome>;
  debts: ReturnType<typeof FinancialInfoService.getDebts>;
  financialMisc: ReturnType<typeof FinancialInfoService.getMisc>;
  taxDocuments: ReturnType<typeof TaxDocumentService.getAllDocuments>;
  paymentCards: ReturnType<typeof PaymentCardService.getRaw>;
  bankAccounts: ReturnType<typeof BankAccountService.getRaw>;
  keyPeople: ReturnType<typeof KeyPeopleService.getAllKeyPeople>;
  trustedPeople: ReturnType<typeof PeopleService.getRaw>;
  accessGrants: ReturnType<typeof AccessService.getRawGrants>;
}

export async function gatherExportData(): Promise<ExportData> {
  await refreshAllData();
  return {
    exportedAt: new Date().toISOString(),
    bills: BillService.getAllBills(),
    events: EventService.getAllEvents(),
    documents: DocumentService.getAll(),
    insurance: FinancialInfoService.getInsurance(),
    superannuation: FinancialInfoService.getSuperannuation(),
    income: FinancialInfoService.getIncome(),
    debts: FinancialInfoService.getDebts(),
    financialMisc: FinancialInfoService.getMisc(),
    taxDocuments: TaxDocumentService.getAllDocuments(),
    paymentCards: PaymentCardService.getRaw(),
    bankAccounts: BankAccountService.getRaw(),
    keyPeople: KeyPeopleService.getAllKeyPeople(),
    trustedPeople: PeopleService.getRaw(),
    accessGrants: AccessService.getRawGrants(),
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadJSON(): Promise<void> {
  const data = await gatherExportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `billvie-data-${new Date().toISOString().split('T')[0]}.json`);
}

const billColumns: CSVColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'amount', label: 'Amount' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'isRecurring', label: 'Recurring' },
  { key: 'recurringInterval', label: 'Interval' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'notes', label: 'Notes' },
];

const eventColumns: CSVColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
  { key: 'budget', label: 'Budget' },
  { key: 'notes', label: 'Notes' },
];

const documentColumns: CSVColumn[] = [
  { key: 'title', label: 'Title' },
  { key: 'provider', label: 'Provider' },
  { key: 'type', label: 'Type' },
  { key: 'keyDetail', label: 'Key Detail' },
  { key: 'notes', label: 'Notes' },
];

const insuranceColumns: CSVColumn[] = [
  { key: 'provider', label: 'Provider' },
  { key: 'type', label: 'Type' },
  { key: 'policyNumber', label: 'Policy Number' },
  { key: 'premium', label: 'Premium' },
  { key: 'contactInfo', label: 'Contact' },
  { key: 'notes', label: 'Notes' },
];

const superannuationColumns: CSVColumn[] = [
  { key: 'fundName', label: 'Fund Name' },
  { key: 'accountNumber', label: 'Account Number' },
  { key: 'estimatedBalance', label: 'Estimated Balance' },
  { key: 'contactInfo', label: 'Contact' },
  { key: 'notes', label: 'Notes' },
];

const incomeColumns: CSVColumn[] = [
  { key: 'sourceName', label: 'Source' },
  { key: 'approximateAmount', label: 'Approximate Amount' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'notes', label: 'Notes' },
];

const debtColumns: CSVColumn[] = [
  { key: 'owedTo', label: 'Owed To' },
  { key: 'type', label: 'Type' },
  { key: 'approximateBalance', label: 'Balance' },
  { key: 'notes', label: 'Notes' },
];

const miscColumns: CSVColumn[] = [
  { key: 'key', label: 'Label' },
  { key: 'value', label: 'Value' },
  { key: 'notes', label: 'Notes' },
];

const taxDocColumns: CSVColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'year', label: 'Year' },
  { key: 'amount', label: 'Amount' },
  { key: 'categories', label: 'Categories' },
  { key: 'notes', label: 'Notes' },
];

const bankAccountColumns: CSVColumn[] = [
  { key: 'nickname', label: 'Nickname' },
  { key: 'institution', label: 'Institution' },
  { key: 'lastDigits', label: 'Last Digits' },
  { key: 'notes', label: 'Notes' },
  { key: 'deletedAt', label: 'Deleted At' },
];

const paymentCardColumns: CSVColumn[] = [
  { key: 'nickname', label: 'Nickname' },
  { key: 'expiryMonth', label: 'Expiry Month' },
  { key: 'expiryYear', label: 'Expiry Year' },
  { key: 'notes', label: 'Notes' },
  { key: 'deletedAt', label: 'Deleted At' },
];

const keyPersonColumns: CSVColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'relationship', label: 'Relationship' },
  { key: 'role', label: 'Role' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'notes', label: 'Notes' },
];

const trustedPersonColumns: CSVColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'accessLevel', label: 'Access Level' },
  { key: 'status', label: 'Status' },
];

const grantColumns: CSVColumn[] = [
  { key: 'personId', label: 'Person ID' },
  { key: 'scope', label: 'Scope' },
  { key: 'resourceId', label: 'Resource ID' },
  { key: 'revokedAt', label: 'Revoked At' },
];

function toCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: CSVColumn[]
): string {
  const mapped = rows.map((row) => {
    const out: Record<string, string | number | undefined> = {};
    for (const col of columns) {
      const val = row[col.key];
      if (val === null || val === undefined) {
        out[col.key] = '';
      } else if (typeof val === 'boolean') {
        out[col.key] = val ? 'Yes' : 'No';
      } else if (Array.isArray(val)) {
        out[col.key] = val.join('; ');
      } else {
        out[col.key] = String(val);
      }
    }
    return out;
  });
  return arrayToCSV(mapped, columns);
}

const README_CONTENT = `Billvie Data Export
===================

This file was generated on ${new Date().toLocaleString()}.

What's inside
-------------
This ZIP contains one CSV file per category in your Billvie household:

  Bills.csv             — Your bills and payment details
  Events.csv            — Events and plans
  Documents.csv         — Important documents (metadata only, not file contents)
  Financial-Snapshot.csv — Insurance, superannuation, income, debts, and other
  Tax-Documents.csv     — Tax document records
  Bank-Accounts.csv     — Bank account nicknames and references
  Payment-Cards.csv     — Payment card nicknames and expiry
  Key-People.csv        — Key contacts for your family
  Trusted-People.csv    — Trusted people and their access level

Notes
-----
- This is a personal record for your own keeping. You don't need it to
  continue using Billvie — your data stays in your account.
- Document file contents (PDFs, images) are not included — only the
  metadata you entered.
- Removed or soft-deleted items are included in Bank Accounts and Payment
  Cards for historical completeness.
- Keep this file somewhere safe. It contains sensitive household information.

Generated by Billvie — your household continuity app.`;

export async function downloadCSVBundle(): Promise<void> {
  const data = await gatherExportData();
  const zip = new JSZip();

  zip.file('README.txt', README_CONTENT);

  if (data.bills.length > 0) zip.file('Bills.csv', toCSV(data.bills, billColumns));
  if (data.events.length > 0) zip.file('Events.csv', toCSV(data.events, eventColumns));
  if (data.documents.length > 0) zip.file('Documents.csv', toCSV(data.documents, documentColumns));

  const financialRows = [
    ...data.insurance.map((i) => ({ ...i, _cat: 'Insurance' })),
    ...data.superannuation.map((s) => ({ ...s, _cat: 'Superannuation' })),
    ...data.income.map((i) => ({ ...i, _cat: 'Income' })),
    ...data.debts.map((d) => ({ ...d, _cat: 'Debt' })),
    ...data.financialMisc.map((m) => ({ ...m, _cat: 'Other' })),
  ];
  if (financialRows.length > 0) {
    const financialColumns: CSVColumn[] = [
      { key: '_cat', label: 'Category' },
      { key: 'provider', label: 'Provider/Fund/Source' },
      { key: 'type', label: 'Type' },
      { key: 'policyNumber', label: 'Policy/Account Number' },
      { key: 'premium', label: 'Premium/Amount/Balance' },
      { key: 'contactInfo', label: 'Contact' },
      { key: 'notes', label: 'Notes' },
      { key: 'key', label: 'Label' },
      { key: 'value', label: 'Value' },
    ];
    zip.file('Financial-Snapshot.csv', toCSV(financialRows, financialColumns));
  }

  if (data.taxDocuments.length > 0) zip.file('Tax-Documents.csv', toCSV(data.taxDocuments, taxDocColumns));
  if (data.bankAccounts.length > 0) zip.file('Bank-Accounts.csv', toCSV(data.bankAccounts, bankAccountColumns));
  if (data.paymentCards.length > 0) zip.file('Payment-Cards.csv', toCSV(data.paymentCards, paymentCardColumns));
  if (data.keyPeople.length > 0) zip.file('Key-People.csv', toCSV(data.keyPeople, keyPersonColumns));
  if (data.trustedPeople.length > 0) zip.file('Trusted-People.csv', toCSV(data.trustedPeople, trustedPersonColumns));

  const grantRows = data.accessGrants.map((g) => ({
    personId: g.personId,
    scope: g.scope,
    resourceId: g.resourceId ?? '',
    revokedAt: g.revokedAt ?? '',
  }));
  if (grantRows.length > 0) zip.file('Access-Grants.csv', toCSV(grantRows, grantColumns));

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `billvie-data-${new Date().toISOString().split('T')[0]}.zip`);
}
