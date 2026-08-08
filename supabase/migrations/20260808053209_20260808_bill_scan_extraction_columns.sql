/*
# Bill Scan Extraction — Schema + Quota Tracking

## Overview
Adds the data model needed to support AI bill scanning. Five new nullable columns
on the `bills` table track extraction state, and a new `household_scan_usage`
table tracks the monthly free-tier scan quota (5/month free, unlimited paid).
Zero visible change to the app — manual bill add/edit works exactly as before
since all new columns are nullable.

## Changes to bills table
- `extraction_status` (text, nullable) — 'processing' | 'needs_review' | 'failed'; null = normal manually-entered bill
- `source_document_id` (uuid, nullable, FK to documents, ON DELETE SET NULL)
- `extraction_confidence` (jsonb, nullable) — per-field confidence ratings
- `processing_started_at` (timestamptz, nullable) — when the scan was triggered; used by the watchdog timeout
- `extraction_error` (text, nullable) — stores the error reason on failure

## New Table: household_scan_usage
Tracks the monthly free-tier AI scan quota. Decoupled from the 25-bill cap.
- `household_id` (uuid, PK, FK to households ON DELETE CASCADE)
- `period_start` (date, not null) — first of the calendar month this count applies to
- `scan_count` (int, not null, default 0)
- `updated_at` (timestamptz, not null, default now())

## Security
- RLS enabled on household_scan_usage.
- Household members can read their own row; only service role writes.
- New columns on bills are covered by existing row-level policies.

## Watchdog
SECURITY DEFINER function flips bills stuck in 'processing' > 3 minutes to 'failed'.
Scheduled via pg_cron every 3 minutes.
*/

-- ============================================================
-- 1. ADD EXTRACTION COLUMNS TO bills
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'extraction_status'
  ) THEN
    ALTER TABLE bills ADD COLUMN extraction_status text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'source_document_id'
  ) THEN
    ALTER TABLE bills ADD COLUMN source_document_id uuid REFERENCES documents(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'extraction_confidence'
  ) THEN
    ALTER TABLE bills ADD COLUMN extraction_confidence jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'processing_started_at'
  ) THEN
    ALTER TABLE bills ADD COLUMN processing_started_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'extraction_error'
  ) THEN
    ALTER TABLE bills ADD COLUMN extraction_error text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bills_extraction_status ON bills(extraction_status) WHERE extraction_status IS NOT NULL;

-- ============================================================
-- 2. household_scan_usage TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS household_scan_usage (
  household_id uuid PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  scan_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE household_scan_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read_scan_usage" ON household_scan_usage;
CREATE POLICY "members_read_scan_usage"
  ON household_scan_usage FOR SELECT
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ============================================================
-- 3. WATCHDOG FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION bill_scan_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bills
  SET extraction_status = 'failed',
      extraction_error = 'timed out',
      processing_started_at = NULL,
      updated_at = now()
  WHERE extraction_status = 'processing'
    AND processing_started_at < now() - interval '3 minutes';
END;
$$;

-- ============================================================
-- 4. SCHEDULE THE WATCHDOG VIA pg_cron
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'bill_scan_watchdog';
  IF v_job_id IS NULL THEN
    PERFORM cron.schedule(
      'bill_scan_watchdog',
      '*/3 * * * *',
      'SELECT bill_scan_watchdog();'
    );
  END IF;
END;
$$;