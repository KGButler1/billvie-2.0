/*
# Financial Snapshot links to bank accounts and payment cards

## Purpose
Gives the Financial Snapshot forms an optional way to point at the same
lightweight account/card records Bills already uses, reusing the existing
pickers rather than building new ones or merging tables.

## Modified Tables (all additive, all nullable)

### financial_superannuation
- Adds linked_bank_account_id (uuid, nullable, references bank_accounts, ON DELETE SET NULL)

### financial_income
- Adds linked_bank_account_id (uuid, nullable, references bank_accounts, ON DELETE SET NULL)

### financial_debts
- Adds linked_bank_account_id  (uuid, nullable, references bank_accounts,  ON DELETE SET NULL)
- Adds linked_payment_card_id  (uuid, nullable, references payment_cards,   ON DELETE SET NULL)
- Adds account_number          (text, nullable)
- Adds contact_info            (text, nullable)

## Security
- No RLS changes needed. All four tables already have per-household policies
  that cover new columns automatically.

## Notes
1. All new columns nullable — every link is optional.
2. ON DELETE SET NULL on every FK so deleting an account/card doesn't lose
   financial snapshot data, matching the pattern used for bills.bank_account_id.
3. No CHECK constraint on financial_debts.type exists, so credit_card is a
   TypeScript-side change only (type union + label map).
*/

-- financial_superannuation: linked_bank_account_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_superannuation' AND column_name = 'linked_bank_account_id'
  ) THEN
    ALTER TABLE financial_superannuation
      ADD COLUMN linked_bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- financial_income: linked_bank_account_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_income' AND column_name = 'linked_bank_account_id'
  ) THEN
    ALTER TABLE financial_income
      ADD COLUMN linked_bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- financial_debts: linked_bank_account_id, linked_payment_card_id, account_number, contact_info
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_debts' AND column_name = 'linked_bank_account_id'
  ) THEN
    ALTER TABLE financial_debts
      ADD COLUMN linked_bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_debts' AND column_name = 'linked_payment_card_id'
  ) THEN
    ALTER TABLE financial_debts
      ADD COLUMN linked_payment_card_id uuid REFERENCES payment_cards(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_debts' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE financial_debts ADD COLUMN account_number text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_debts' AND column_name = 'contact_info'
  ) THEN
    ALTER TABLE financial_debts ADD COLUMN contact_info text;
  END IF;
END $$;