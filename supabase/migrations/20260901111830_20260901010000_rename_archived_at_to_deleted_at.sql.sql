/*
# Rename archived_at to deleted_at on bank_accounts and payment_cards

1. Changes
- Rename `archived_at` to `deleted_at` on `bank_accounts`.
- Rename `archived_at` to `deleted_at` on `payment_cards`.
- This is a straight column rename. Existing data carries over — any row that
  was archived now shows as soft-deleted, which is the same behavior, just
  recoverable from Recently Deleted instead of the old in-sheet Archived section.
2. Security
- No RLS policy changes needed. `is_household_member` already gates all access.
  No policy references `archived_at` by name.
3. Notes
- `bank_accounts.id` is referenced by `bills.bank_account_id`,
  `financial_income.linked_bank_account_id`, `financial_debts.linked_bank_account_id`,
  and `financial_superannuation.linked_bank_account_id`, all with ON DELETE SET NULL.
- `payment_cards.id` is referenced by `bills.payment_card_id` and
  `financial_debts.linked_payment_card_id`, both with ON DELETE SET NULL.
- The rename does not affect these FK constraints — only the column name changes.
*/

ALTER TABLE bank_accounts RENAME COLUMN archived_at TO deleted_at;
ALTER TABLE payment_cards RENAME COLUMN archived_at TO deleted_at;
