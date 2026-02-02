

# Tax Documents Enhancement Plan

## Overview
This plan addresses four key improvements to the Tax Documents feature:
1. File attachment support (PDF, JPG, etc.)
2. Enhanced sharing permissions with visibility and category-based controls
3. Custom categories and years management
4. Multiple categories per document (tag-like behavior)

---

## 1. File Attachment Support

### What You'll Get
- An "Attach File" button in the Add/Edit Document modal
- Visual preview of attached files (thumbnail for images, icon for PDFs)
- Ability to remove or replace attachments
- Display of attachment indicator on document cards

### How It Works
Since this app uses localStorage (no cloud backend), file attachments will be stored as Base64 data URLs. This allows files to persist across sessions.

### Changes Required

**Update Type Definition** (`src/types/sharing.ts`):
- Change `fileRef?: string` to a structured attachment object:
```text
attachment?: {
  name: string;
  type: string;      // e.g., 'application/pdf', 'image/jpeg'
  size: number;
  dataUrl: string;   // Base64-encoded file content
}
```

**Update Add Document Modal** (`src/pages/TaxDocuments.tsx`):
- Add file input with drag-and-drop zone
- Show file preview (image thumbnail or file icon)
- Add remove attachment button

**Update Document Cards**:
- Show paperclip/attachment icon when file is attached
- Allow clicking to view/download the attachment

---

## 2. Enhanced Sharing Permissions

### What You'll Get
- **Sharing Panel** directly in Tax Documents page (not just a modal)
- Clear visibility of who has access and their permission level
- Category-based sharing (share only "Medical" or "Work Expenses")
- Year-based sharing (share only 2024 documents)
- Easy accountant switching (revoke old, invite new)

### New Components

**TaxSharingPanel** (`src/components/tax/TaxSharingPanel.tsx`):
A dedicated section showing:
- Current shares with name, email, permissions, and what's shared
- Filter badges showing which categories/years are shared
- "Revoke" button for each share
- "Add New Share" button

**Enhanced Share Modal for Tax Documents**:
Add options for:
- Select specific categories to share (multi-select checkboxes)
- Select specific years to share
- Permission level (View Only / Full Access)

### Data Model Changes

**Update Share type** (`src/types/sharing.ts`):
```text
// For tax document shares
sharedCategories?: TaxCategory[];  // undefined = all categories
sharedYears?: number[];            // undefined = all years
```

### User Experience
- Prominent "Sharing" section below the filters showing active shares
- Each share shows: "John Smith (View Only) - Medical, Work Expenses - 2024, 2025"
- Quick "Change Accountant" flow: Revoke existing + Add new in one action

---

## 3. Custom Categories and Years Management

### What You'll Get
- **Manage Categories** button/link in the filter area
- Modal to add, edit, rename, and delete custom categories
- Custom years (not limited to current year minus 2)
- Categories with custom icons/colors

### New Components

**ManageCategoriesModal** (`src/components/tax/ManageCategoriesModal.tsx`):
- List all categories (default + custom)
- Add new category with name and optional icon
- Edit existing categories (rename)
- Delete custom categories (with warning if documents use it)

**ManageYearsModal** (`src/components/tax/ManageYearsModal.tsx`):
- List of years in use
- Add custom year (for historical documents)
- Remove year from list (only if no documents use it)

### Data Model Changes

**New type for custom categories** (`src/types/sharing.ts`):
```text
interface CustomTaxCategory {
  id: string;
  label: string;
  icon: string;
  isDefault: boolean;
}
```

**New service methods** (`src/services/TaxDocumentService.ts`):
- `getCategories()`: Returns default + custom categories
- `addCategory(label, icon)`: Creates custom category
- `updateCategory(id, updates)`: Renames category
- `deleteCategory(id)`: Removes category (with validation)
- `getCustomYears()`: Returns user-added years
- `addCustomYear(year)`: Adds a year option
- `removeCustomYear(year)`: Removes year option

---

## 4. Multiple Categories (Tags)

### What You'll Get
- Documents can have multiple categories (like tags)
- Filter by any matching tag
- Visual display of multiple tags on document cards

### Data Model Changes

**Update TaxDocument type** (`src/types/sharing.ts`):
```text
// Change from:
category: TaxCategory;

// To:
categories: TaxCategory[];  // Array of category IDs
```

### UI Changes

**Document Cards**:
- Show multiple category badges (scrollable if needed)
- Primary category shown first, others as smaller badges

**Add/Edit Modal**:
- Replace single dropdown with multi-select checkboxes or tag-style input
- At least one category required

**Filtering**:
- Category filter shows documents matching ANY selected category
- Clear indication when multiple filters are active

### Migration
- Existing documents with single `category` will be migrated to `categories: [category]`

---

## Implementation Sequence

1. **Phase 1 - Data Layer Updates**
   - Update types in `src/types/sharing.ts`
   - Update `TaxDocumentService.ts` with new methods
   - Add category/year management service methods
   - Create migration for existing documents

2. **Phase 2 - Category & Year Management**
   - Create `ManageCategoriesModal.tsx`
   - Create `ManageYearsModal.tsx`
   - Add management buttons to Tax Documents page

3. **Phase 3 - Multi-Category Support**
   - Update Add/Edit modal for multi-select
   - Update document cards to show multiple badges
   - Update filtering logic

4. **Phase 4 - File Attachments**
   - Add file input component with drag-and-drop
   - Implement Base64 storage
   - Add preview and download functionality

5. **Phase 5 - Enhanced Sharing**
   - Create `TaxSharingPanel.tsx`
   - Update `ShareModal` for category/year selection
   - Update `SharingService` with new share properties

---

## Technical Notes

### File Size Considerations
Since localStorage has a ~5MB limit per domain, we'll:
- Limit individual file size to 2MB
- Show warning when approaching storage limits
- Compress images where possible

### Category Management Storage
Custom categories stored in localStorage under key: `billvie_tax_categories`

### Share Filtering Logic
When a share has category/year restrictions:
- Shared user only sees documents matching those filters
- Activity log notes which categories were shared

---

## Files to Create
- `src/components/tax/TaxSharingPanel.tsx`
- `src/components/tax/ManageCategoriesModal.tsx`
- `src/components/tax/ManageYearsModal.tsx`
- `src/components/tax/FileAttachment.tsx`

## Files to Modify
- `src/types/sharing.ts` - Update TaxDocument and Share types
- `src/services/TaxDocumentService.ts` - Add category/year management
- `src/services/SharingService.ts` - Add category/year share filters
- `src/pages/TaxDocuments.tsx` - Integrate new components and features
- `src/components/sharing/ShareModal.tsx` - Add category/year selection for tax shares

