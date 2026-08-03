import { FileAttachment } from '@/types/sharing';

export type DocumentType = 'insurance' | 'investment' | 'account' | 'superannuation' | 'will' | 'other';

export interface HouseholdDocument {
  id: string;
  title: string;
  provider: string;
  type: DocumentType;
  keyDetail?: string;
  notes?: string;
  attachment?: FileAttachment;
  externalLink?: string;
  physicalLocation?: string;
  taggedPersonIds?: string[]; // TrustedPerson ids — wayfinding only, never access

  deletedAt?: string; // Soft delete — recoverable from Recently Deleted for 30 days
  createdAt: string;
  updatedAt: string;
}


export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  insurance: 'Insurance',
  investment: 'Investment',
  account: 'Account',
  superannuation: 'Super / 401k',
  will: 'Will / Estate',
  other: 'Other',
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  insurance: 'Shield',
  investment: 'TrendingUp',
  account: 'Building',
  superannuation: 'Landmark',
  will: 'FileText',
  other: 'File',
};
