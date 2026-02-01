// Sharing Types
export type SharePermission = 'view' | 'edit';
export type ShareType = 'bills' | 'event' | 'tax_documents';
export type ShareStatus = 'pending' | 'accepted' | 'declined';

export interface Share {
  id: string;
  type: ShareType;
  resourceId?: string; // For specific event, undefined for all bills
  resourceName?: string; // Event name or "All Bills"
  ownerId: string;
  sharedWithEmail: string;
  sharedWithName?: string;
  permission: SharePermission;
  status: ShareStatus;
  shareLink?: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface ActivityLogEntry {
  id: string;
  shareId: string;
  action: string;
  performedBy: string;
  performedByName?: string;
  details?: string;
  timestamp: string;
}

// Tax Document Types
export type TaxCategory = 'charity' | 'medical' | 'work_expenses' | 'education' | 'other';

export interface TaxDocument {
  id: string;
  name: string;
  category: TaxCategory;
  year: number;
  amount?: number;
  notes?: string;
  fileRef?: string; // Reference to uploaded file (in a real app, this would be a URL)
  isTaxRelevant: boolean;
  createdAt: string;
  updatedAt: string;
}

// Accountant Types
export interface AccountantClient {
  id: string;
  name: string;
  email: string;
  connectionStatus: 'pending' | 'connected' | 'disconnected';
  lastUpdated: string;
  connectedAt?: string;
}

export interface AccountantProfile {
  accountantId: string;
  displayName: string;
  email: string;
  clients: AccountantClient[];
  createdAt: string;
}

// Labels
export const TAX_CATEGORY_LABELS: Record<TaxCategory, string> = {
  charity: 'Charity/Donations',
  medical: 'Medical Expenses',
  work_expenses: 'Work Expenses',
  education: 'Education',
  other: 'Other',
};

export const TAX_CATEGORY_ICONS: Record<TaxCategory, string> = {
  charity: '❤️',
  medical: '🏥',
  work_expenses: '💼',
  education: '📚',
  other: '📄',
};

export const SHARE_PERMISSION_LABELS: Record<SharePermission, string> = {
  view: 'View Only',
  edit: 'Full Access',
};
