/*
# Bank Accounts table and bills.bank_account_id FK

## Purpose
Adds a lightweight bank-account reference table, mirroring `payment_cards`,
so a bill can say "which account" the same way it already says "which card."
Also adds a nullable FK column on `bills` pointing to it.

## New Table: bank_accounts
- id (uuid PK, default gen_random_uuid())
- household_id (uuid NOT NULL, references households, ON DELETE CASCADE)
- nickname (text NOT NULL) — "Everyday account", "Mortgage offset"
- institution (text, nullable) — "Commonwealth Bank"
- last_digits (text, nullable) — last 2-4 digits, stored as text to preserve leading zeros
- notes (text, nullable)
- archived_at (timestamptz, nullable) — soft-archive; accounts linked to bills are never hard-deleted
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## Modified Table: bills
- Adds bank_account_id (uuid, nullable, references bank_accounts, ON DELETE SET NULL)

## Security
- RLS enabled on bank_accounts.
- Four policies (SELECT/INSERT/UPDATE/DELETE) gated on household membership via is_household_member().
- This is a straight copy of the payment_cards RLS pattern.

## Notes
1. No BSB, no full account number, no online banking details — same privacy stance as payment_cards.
2. ON DELETE SET NULL on bills.bank_account_id so deleting an account doesn't lose bill data.
*/

CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  institution text,
  last_digits text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_bank_accounts" ON bank_accounts;
CREATE POLICY "read_bank_accounts" ON bank_accounts
  FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "insert_bank_accounts" ON bank_accounts;
CREATE POLICY "insert_bank_accounts" ON bank_accounts
  FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_bank_accounts" ON bank_accounts;
CREATE POLICY "update_bank_accounts" ON bank_accounts
  FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_bank_accounts" ON bank_accounts;
CREATE POLICY "delete_bank_accounts" ON bank_accounts
  FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- Add bank_account_id to bills (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'bank_account_id'
  ) THEN
    ALTER TABLE bills ADD COLUMN bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;