import { BillService } from '@/services/BillService';
import { UserService } from '@/services/UserService';
import { BILL_LIMITS } from '@/types/bill';

export const canAddBill = (): boolean => {
  const settings = UserService.getSettings();
  const currentCount = BillService.getBillCount();
  const limit = BILL_LIMITS[settings.userType];
  return currentCount < limit;
};
