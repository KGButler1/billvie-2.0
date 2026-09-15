/*
# Set default on item_flags.created_by

1. Changes
- ALTER TABLE item_flags ALTER COLUMN created_by SET DEFAULT auth.uid()
2. Rationale
- ItemFlagService.setFlags inserts rows without specifying created_by.
- The column is NOT NULL with no default, causing insert failures.
- Setting the default to auth.uid() fills it from the authenticated session.
3. Security
- No RLS or policy changes.
*/

ALTER TABLE item_flags ALTER COLUMN created_by SET DEFAULT auth.uid();
