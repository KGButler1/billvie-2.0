/*
# Financial Snapshot soft delete columns

1. Changes
- Add `deleted_at timestamptz` to `financial_insurance`, `financial_superannuation`,
  `financial_income`, `financial_debts`, and `financial_misc`.
- All five columns default to NULL (not deleted). When set, the row is soft-deleted
  and recoverable from Recently Deleted.
2. Security
- No RLS policy changes needed. `is_household_member` already gates all access
  on these tables, and `deleted_at` is just a filter column the service layer uses.
3. Notes
- No foreign keys reference any of these five tables, so soft-deleting a row
  has no cascading effect on other data.
*/

ALTER TABLE financial_insurance ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE financial_superannuation ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE financial_income ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE financial_debts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE financial_misc ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
