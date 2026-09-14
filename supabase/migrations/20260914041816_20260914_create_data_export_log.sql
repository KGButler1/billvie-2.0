/*
# Create data_export_log table

1. Purpose
   Logs each completed data download (CSV or JSON) so the household has an
   audit trail of who exported the full household's data and when.

2. New Tables
   - data_export_log
     - id (uuid, primary key, auto-generated)
     - household_id (uuid, not null, references households(id))
     - exported_by (uuid, not null, references auth.users(id))
     - format (text, not null — 'csv' or 'json')
     - created_at (timestamptz, default now())

3. Security — RLS
   - SELECT: only household admins (owners + co-owners) can see the log.
     This mirrors the `members_read_key_people` policy shape from the
     20260913 RLS lockdown migration, using is_household_admin().
     Only admins see this because it's an audit trail of who downloaded
     the entire household's data — not a shareable object.
   - INSERT: any authenticated household member can insert a log row
     when they trigger a download (the app writes this after a successful
     export). Uses is_household_member() so the inserting user must belong
     to the same household.
   - No UPDATE or DELETE policies — the log is read-only from the app's
     perspective. An audit trail that can be edited isn't trustworthy.

4. Important Notes
   - This table does NOT change who can download — the existing isPaid gate
     in Settings.tsx controls that. This only records what happened.
   - No UPDATE or DELETE policies exist by design.
*/

CREATE TABLE IF NOT EXISTS data_export_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  exported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('csv', 'json')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data_export_log ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT (owners + co-owners)
DROP POLICY IF EXISTS "admins_read_export_log" ON data_export_log;
CREATE POLICY "admins_read_export_log"
  ON data_export_log FOR SELECT TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- Any household member can INSERT (log a download they performed)
DROP POLICY IF EXISTS "members_insert_export_log" ON data_export_log;
CREATE POLICY "members_insert_export_log"
  ON data_export_log FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

-- No UPDATE or DELETE policies — the log is immutable from the app.