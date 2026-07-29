import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { DocumentService } from '@/services/DocumentService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { TaxDocumentService } from '@/services/TaxDocumentService';

export function downloadBackup() {
  const backup = {
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
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `billvie-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
