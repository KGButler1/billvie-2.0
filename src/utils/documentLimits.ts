import { DocumentService } from '@/services/DocumentService';
import { DOCUMENT_LIMITS } from '@/types/bill';

export const canAddDocument = (isPaid: boolean): boolean => {
  const currentCount = DocumentService.getCount();
  const limit = isPaid ? DOCUMENT_LIMITS.paid : DOCUMENT_LIMITS.free;
  return currentCount < limit;
};
