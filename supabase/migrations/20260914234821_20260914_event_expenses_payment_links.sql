/*
# Add payment_card_id and bank_account_id to event_expenses

1. New Columns
- `event_expenses.payment_card_id` (uuid, nullable) — links an expense to a payment card, matching the pattern on `bills.payment_card_id`.
- `event_expenses.bank_account_id` (uuid, nullable) — links an expense to a bank account, matching the pattern on `bills.bank_account_id`.

2. Foreign Keys
- `payment_card_id` references `payment_cards(id)` ON DELETE SET NULL — if the card is permanently deleted, the link is cleared but the expense stays.
- `bank_account_id` references `bank_accounts(id)` ON DELETE SET NULL — same behavior for accounts.

3. Notes
- Both columns are nullable so existing expenses are unaffected.
- This mirrors how `bills` already links to cards/accounts, so the same Recently Deleted soft-delete pattern applies: when a card/account is soft-deleted (deleted_at set), the expense's link stays in place but the card/account won't appear in pickers. If the card/account is permanently deleted, the FK SET NULL clears the link automatically.
*/

ALTER TABLE event_expenses
  ADD COLUMN IF NOT EXISTS payment_card_id uuid REFERENCES payment_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;
