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
  importantDate?: string; // ISO date — expiry, renewal, term end
  importantDateLabel?: string; // e.g. "Expires", "Renews", "Term ends"
  taggedPersonIds?: string[]; // TrustedPerson ids — wayfinding only, never access

  scanSourced?: boolean; // true when auto-created by bill-scan; hidden from document lists
  deletedAt?: string; // Soft delete — recoverable from Recently Deleted for 30 days
  createdAt: string;
  updatedAt: string;
}


export const IMPORTANT_DATE_LABEL_PRESETS = ['Expires', 'Renews', 'Term ends'] as const;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  insurance: 'Insurance',
  investment: 'Investment',
  account: 'Account',
  superannuation: 'Savings & Retirement',
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
