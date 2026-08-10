/*
# Add linked_document_id to financial entry tables

1. Purpose
   Each of the five financial entry tables (insurance, superannuation, income,
   debts, misc) gets an optional foreign key to documents(id). This lets a
   Financial Snapshot entry point at the document it relates to — a policy
   document for an insurance entry, a statement for an account, etc.

2. Schema changes
   - financial_insurance.linked_document_id  uuid REFERENCES documents(id)
   - financial_superannuation.linked_document_id  uuid REFERENCES documents(id)
   - financial_income.linked_document_id  uuid REFERENCES documents(id)
   - financial_debts.linked_document_id  uuid REFERENCES documents(id)
   - financial_misc.linked_document_id  uuid REFERENCES documents(id)

3. Notes
   - All columns are nullable — linking a document is optional.
   - financial_insurance already has a separate document_link text column
     (a raw URL). That column is untouched and is NOT the same as this new
     foreign key. No data migration between them.
   - financial_insurance.linked_bill_id is also untouched.
   - No RLS or policy changes needed — the new columns are readable/writable
     under existing per-table policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_insurance' AND column_name = 'linked_document_id'
  ) THEN
    ALTER TABLE financial_insurance ADD COLUMN linked_document_id uuid REFERENCES documents(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_superannuation' AND column_name = 'linked_document_id'
  ) THEN
    ALTER TABLE financial_superannuation ADD COLUMN linked_document_id uuid REFERENCES documents(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_income' AND column_name = 'linked_document_id'
  ) THEN
    ALTER TABLE financial_income ADD COLUMN linked_document_id uuid REFERENCES documents(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_debts' AND column_name = 'linked_document_id'
  ) THEN
    ALTER TABLE financial_debts ADD COLUMN linked_document_id uuid REFERENCES documents(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_misc' AND column_name = 'linked_document_id'
  ) THEN
    ALTER TABLE financial_misc ADD COLUMN linked_document_id uuid REFERENCES documents(id);
  END IF;
END $$;
