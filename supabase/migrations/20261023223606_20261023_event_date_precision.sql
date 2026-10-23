/*
# Add date_precision column to events

1. Changes
- Adds `date_precision` column to the `events` table.
- Type: text NOT NULL DEFAULT 'day', CHECK constraint in ('day', 'month').
- Existing rows automatically get 'day' (the default), preserving current behaviour.
- No data loss — all existing events keep their current date semantics.

2. Security
- No changes to RLS policies or grants. The column is writable by the same
  roles that already have UPDATE on `events` (authenticated via existing policies).
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'date_precision'
  ) THEN
    ALTER TABLE events ADD COLUMN date_precision text NOT NULL DEFAULT 'day';
    ALTER TABLE events ADD CONSTRAINT events_date_precision_check
      CHECK (date_precision IN ('day', 'month'));
  END IF;
END $$;
