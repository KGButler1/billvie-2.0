// File Attachment Type
export interface FileAttachment {
  name: string;
  type: string; // e.g., 'application/pdf', 'image/jpeg'
  size: number;
  dataUrl: string; // Base64-encoded file content
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
