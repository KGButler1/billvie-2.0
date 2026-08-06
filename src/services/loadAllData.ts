import { BillService } from './BillService';
import { DocumentService } from './DocumentService';
import { EventService } from './EventService';
import { PaymentCardService } from './PaymentCardService';
import { KeyPeopleService } from './KeyPeopleService';
import { PeopleService } from './PeopleService';
import { AccessService } from './AccessService';
import { FinancialInfoService } from './FinancialInfoService';
import { TaxDocumentService } from './TaxDocumentService';
import { TaxTagService } from './TaxTagService';
import { DocumentLinkService } from './DocumentLinkService';
import { CustomBillOptionsService } from './CustomBillOptionsService';
import { ExclusionService } from './ExclusionService';
import { clearHouseholdCache } from './supabaseData';

// Refresh all domain services from Supabase. Called on app mount after
// authentication is confirmed. Each service caches results in memory so
// the synchronous getters pages already use continue to work.
export async function refreshAllData(): Promise<void> {
  await Promise.all([
    BillService.refresh(),
    DocumentService.refresh(),
    EventService.refresh(),
    PaymentCardService.refresh(),
    KeyPeopleService.refresh(),
    PeopleService.refresh(),
    AccessService.refresh(),
    ExclusionService.refresh(),
    FinancialInfoService.refresh(),
    TaxDocumentService.refresh(),
    TaxTagService.refresh(),
    DocumentLinkService.refresh(),
    CustomBillOptionsService.refresh(),
  ]);
}

export { clearHouseholdCache };
