export type DocumentType = 'insurance' | 'investment' | 'account' | 'superannuation' | 'will' | 'other';

export type DocumentVisibility = 'private' | 'shared';

export interface HouseholdDocument {
  id: string;
  title: string;
  provider: string;
  type: DocumentType;
  keyDetail?: string;
  notes?: string;
  visibility: DocumentVisibility;
  markedForAdvisor: boolean;
  fileName?: string;
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
