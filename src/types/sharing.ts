// Sharing Types
export type SharePermission = 'view' | 'edit';
export type ShareType = 'bills' | 'event' | 'tax_documents' | 'advisor';
export type ShareStatus = 'pending' | 'accepted' | 'declined';

// File Attachment Type
export interface FileAttachment {
  name: string;
  type: string; // e.g., 'application/pdf', 'image/jpeg'
  size: number;
  dataUrl: string; // Base64-encoded file content
}

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
  // Tax document specific sharing filters
  sharedCategories?: TaxCategory[]; // undefined = all categories
  sharedYears?: number[]; // undefined = all years
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
export type TaxCategory = string; // Now supports custom categories

// Default tax categories
export const DEFAULT_TAX_CATEGORIES = ['charity', 'medical', 'work_expenses', 'education', 'other'] as const;
export type DefaultTaxCategory = typeof DEFAULT_TAX_CATEGORIES[number];

// Custom category type
export interface CustomTaxCategory {
  id: string;
  label: string;
  icon: string;
  isDefault: boolean;
}

export interface TaxDocument {
  id: string;
  name: string;
  categories: TaxCategory[]; // Changed from single category to array for multi-tag support
  year: number;
  amount?: number;
  notes?: string;
  attachment?: FileAttachment; // New: file attachment support
  isTaxRelevant: boolean;
  deletedAt?: string; // Soft delete — recoverable from Recently Deleted for 30 days
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

// Default Labels (for built-in categories)
export const TAX_CATEGORY_LABELS: Record<DefaultTaxCategory, string> = {
  charity: 'Charity/Donations',
  medical: 'Medical Expenses',
  work_expenses: 'Work Expenses',
  education: 'Education',
  other: 'Other',
};

export const TAX_CATEGORY_ICONS: Record<DefaultTaxCategory, string> = {
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
