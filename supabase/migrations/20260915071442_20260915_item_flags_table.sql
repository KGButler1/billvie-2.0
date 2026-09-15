/*
# Create item_flags table

1. New Tables
- `item_flags` — stores "For someone in particular" flags on bills and documents.
  - `id` (uuid, pk)
  - `household_id` (uuid, fk → households) — which household this flag belongs to
  - `item_type` (text, check: 'bill' | 'document') — what kind of item is flagged
  - `item_id` (uuid, not null) — the id of the bill or document
  - `trusted_person_id` (uuid, fk → trusted_person ON DELETE CASCADE) — who it's flagged for
  - `created_by` (uuid, fk → auth.users) — who created the flag
  - `created_at` (timestamptz, default now())
  - Unique constraint on (item_type, item_id, trusted_person_id) — max one flag per person per item
  - Index on (household_id, trusted_person_id) — for "what's flagged for me" queries
  - Index on (item_type, item_id) — for "who is this flagged for" queries

2. Security
- RLS enabled.
- Owner/co-owner: SELECT, INSERT, DELETE on flags in households they admin.
- Trusted person: SELECT only on flags where the trusted_person belongs to auth.uid()
  AND that person has an active access_grant for the matching item_type.
  No UPDATE policy — rows are only created or deleted.
- Uses existing is_household_admin() helper for owner checks.
- Uses existing can_access() helper for the trusted-person SELECT predicate.

3. Important notes
- References trusted_person (not auth.users) so flags work for invited people who haven't signed in yet.
- ON DELETE CASCADE on trusted_person means revoking someone removes their flags immediately.
  If the person is restored within the 30-day soft-delete window, flags reappear (the trusted_person row is restored).
- Bills and documents use soft delete (deleted_at). Flags are NOT soft-deleted; they're filtered out
  wherever the parent bill/document is filtered out. When a bill/document is restored, flags return.
- No status column — a flag is either present or absent.
*/

CREATE TABLE IF NOT EXISTS item_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('bill', 'document')),
  item_id uuid NOT NULL,
  trusted_person_id uuid NOT NULL REFERENCES trusted_person(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_flags_unique UNIQUE (item_type, item_id, trusted_person_id)
);

CREATE INDEX IF NOT EXISTS idx_item_flags_household_person
  ON item_flags (household_id, trusted_person_id);
CREATE INDEX IF NOT EXISTS idx_item_flags_item
  ON item_flags (item_type, item_id);

ALTER TABLE item_flags ENABLE ROW LEVEL SECURITY;

-- Owner/co-owner: can SELECT, INSERT, DELETE flags in households they admin
DROP POLICY IF EXISTS "admin_select_item_flags" ON item_flags;
CREATE POLICY "admin_select_item_flags"
  ON item_flags FOR SELECT
  TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "admin_insert_item_flags" ON item_flags;
CREATE POLICY "admin_insert_item_flags"
  ON item_flags FOR INSERT
  TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "admin_delete_item_flags" ON item_flags;
CREATE POLICY "admin_delete_item_flags"
  ON item_flags FOR DELETE
  TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- Trusted person: can SELECT flags on themselves where they have an active access grant
-- for the matching item type. This enforces "flag ≠ access" at the database level.
DROP POLICY IF EXISTS "trusted_select_item_flags" ON item_flags;
CREATE POLICY "trusted_select_item_flags"
  ON item_flags FOR SELECT
  TO authenticated
  USING (
    trusted_person_id IN (
      SELECT id FROM trusted_person
      WHERE trusted_person.user_id = auth.uid()
        AND trusted_person.status = 'active'
    )
    AND (
      is_household_admin(auth.uid(), household_id)
      OR EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.person_id = trusted_person_id
          AND ag.revoked_at IS NULL
          AND (
            (ag.scope = 'bills' AND item_type = 'bill')
            OR (ag.scope = 'documents' AND item_type = 'document')
          )
          AND (ag.item_id IS NULL OR ag.item_id = item_id)
      )
    )
  );
