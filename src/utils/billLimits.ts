import { BillService } from '@/services/BillService';
import { BILL_LIMITS } from '@/types/bill';

export const canAddBill = (isPaid: boolean): boolean => {
  const currentCount = BillService.getBillCount();
  const limit = isPaid ? BILL_LIMITS.paid : BILL_LIMITS.free;
  return currentCount < limit;
};
