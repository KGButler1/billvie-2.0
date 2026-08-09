/*
# Add source column to documents

1. Purpose
   Tracks where a document record originated from — either 'manual' (user-created)
   or 'bill_scan' (auto-created by the bill scanning flow). This lets the Documents
   page separate user-curated records from auto-filed scan sources.

2. Schema changes
   - documents.source: text, NOT NULL, DEFAULT 'manual'
     Values: 'manual' | 'bill_scan'

3. Notes
   - Existing rows default to 'manual', which is correct — all existing documents
     were user-created.
   - The bill-scan flow will set source='bill_scan' on insert going forward.
   - No RLS or policy changes needed — the column is readable/writable under
     existing document policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'source'
  ) THEN
    ALTER TABLE documents ADD COLUMN source text NOT NULL DEFAULT 'manual';
  END IF;
END $$;
