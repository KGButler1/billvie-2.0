/*
# Access Exclusions — hide specific items from an otherwise full-access household member

## Overview
Household members get full access by default (unchanged). This adds a narrow
exception: the household owner can hide a specific item or an entire scope
from a specific member — e.g. a will that shouldn't be visible to everyone,
even though that person otherwise has full household access.

This is deliberately the mirror image of access_grants (which is additive,
"nobody sees it unless granted"). access_exclusions is subtractive: "everyone
in the household sees it unless excluded." Only meaningful for people already
covered by is_household_member() — shared viewers (advisors/accountants)
already only see what's explicitly granted, so exclusions don't apply to them.

## New table: access_exclusions
Same shape and append-only pattern as access_grants. Only the household
owner can create or lift an exclusion — this is a narrower write surface
than access_grants (any household member can manage grants) because
exclusions are specifically the "head of household" control described in
product discussion.

## New functions
- person_id_for_user(user_id, household_id): resolves the caller's own
  trusted_person.id, scoped to a specific household (forward-compatible
  with a person eventually belonging to more than one household).
- is_excluded(person_id, scope, item_id): mirrors can_access()'s logic —
  whole-scope exclusion (item_id null) beats item-level, restored
  exclusions are ignored.

## RLS changes
Every scope-bearing domain table's SELECT policy gets one added condition
on the household-member branch: AND NOT is_excluded(...). The shared-viewer
branch (advisors/accountants via access_grants) is untouched.
payment_cards is untouched — it was never part of the sharing model.

## Also included: create_household_with_owner() fix
"Already has a household" now checks specifically for an OWNER row, not
any active membership. Today this is inert (nothing yet lets an existing
guest try to create their own household), but it's a one-line fix that
prevents a real bug once that button exists later, and it touches this
function anyway.
*/

-- ============================================================
-- 1. ACCESS EXCLUSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS access_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES trusted_person(id) ON DELETE CASCADE,
  scope text NOT NULL,
  item_id uuid,
  excluded_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_access_exclusions_household ON access_exclusions(household_id);
CREATE INDEX IF NOT EXISTS idx_access_exclusions_person ON access_exclusions(person_id);
CREATE INDEX IF NOT EXISTS idx_access_exclusions_scope ON access_exclusions(scope);

ALTER TABLE access_exclusions ENABLE ROW LEVEL SECURITY;

-- Only the household owner can read or write exclusions.
DROP POLICY IF EXISTS "owner_read_access_exclusions" ON access_exclusions;
CREATE POLICY "owner_read_access_exclusions"
  ON access_exclusions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.household_id = access_exclusions.household_id
        AND tp.status = 'active'
        AND tp.access_level = 'owner'
    )
  );

DROP POLICY IF EXISTS "owner_insert_access_exclusions" ON access_exclusions;
CREATE POLICY "owner_insert_access_exclusions"
  ON access_exclusions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.household_id = access_exclusions.household_id
        AND tp.status = 'active'
        AND tp.access_level = 'owner'
    )
  );

DROP POLICY IF EXISTS "owner_update_access_exclusions" ON access_exclusions;
CREATE POLICY "owner_update_access_exclusions"
  ON access_exclusions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.household_id = access_exclusions.household_id
        AND tp.status = 'active'
        AND tp.access_level = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.household_id = access_exclusions.household_id
        AND tp.status = 'active'
        AND tp.access_level = 'owner'
    )
  );
-- No DELETE policy — append-only, matches access_grants.

-- ============================================================
-- 2. HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION person_id_for_user(p_user_id uuid, p_household_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM trusted_person
  WHERE user_id = p_user_id AND household_id = p_household_id AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_excluded(p_person_id uuid, p_scope text, p_item_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM access_exclusions
    WHERE person_id = p_person_id
      AND scope = p_scope
      AND restored_at IS NULL
      AND (
        item_id IS NULL
        OR (p_item_id IS NOT NULL AND item_id = p_item_id)
      )
  );
$$;

-- ============================================================
-- 3. RLS: ADD EXCLUSION CHECK TO EACH DOMAIN TABLE'S SELECT POLICY
-- ============================================================

-- ---- bills ----
DROP POLICY IF EXISTS "read_bills" ON bills;
CREATE POLICY "read_bills"
  ON bills FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'bills', bills.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'bills', bills.id)
    )
  );

-- ---- events ----
DROP POLICY IF EXISTS "read_events" ON events;
CREATE POLICY "read_events"
  ON events FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'events', events.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'events', events.id)
    )
  );

-- ---- event_expenses (scoped by parent event, matching can_access's existing pattern) ----
DROP POLICY IF EXISTS "read_event_expenses" ON event_expenses;
CREATE POLICY "read_event_expenses"
  ON event_expenses FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'events', event_expenses.event_id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'events', event_expenses.event_id)
    )
  );

-- ---- documents ----
DROP POLICY IF EXISTS "read_documents" ON documents;
CREATE POLICY "read_documents"
  ON documents FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'documents', documents.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'documents', documents.id)
    )
  );

-- ---- financial_insurance ----
DROP POLICY IF EXISTS "read_financial_insurance" ON financial_insurance;
CREATE POLICY "read_financial_insurance"
  ON financial_insurance FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_insurance.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_insurance.id)
    )
  );

-- ---- financial_debts ----
DROP POLICY IF EXISTS "read_financial_debts" ON financial_debts;
CREATE POLICY "read_financial_debts"
  ON financial_debts FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_debts.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_debts.id)
    )
  );

-- ---- financial_misc ----
DROP POLICY IF EXISTS "read_financial_misc" ON financial_misc;
CREATE POLICY "read_financial_misc"
  ON financial_misc FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_misc.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_misc.id)
    )
  );

-- ---- tax_documents ----
DROP POLICY IF EXISTS "read_tax_documents" ON tax_documents;
CREATE POLICY "read_tax_documents"
  ON tax_documents FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'tax_documents', tax_documents.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'tax_documents', tax_documents.id)
    )
  );

-- ---- key_people ----
DROP POLICY IF EXISTS "members_read_key_people" ON key_people;
CREATE POLICY "members_read_key_people"
  ON key_people FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'key_people', key_people.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND can_access(tp.id, 'key_people', key_people.id)
    )
  );

-- payment_cards is intentionally untouched — never part of the sharing model.

-- ============================================================
-- 4. FIX: create_household_with_owner() owner-check
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_household_with_owner(p_name text DEFAULT NULL::text, p_user_email text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
v_household_id uuid;
v_user_id uuid := auth.uid();
v_name text;
BEGIN
IF v_user_id IS NULL THEN
RAISE EXCEPTION 'create_household_with_owner requires an authenticated user';
END IF;

-- Changed: only an existing OWNER row counts as "already has a household."
-- A guest membership elsewhere should never block someone from creating
-- their own household.
SELECT tp.household_id INTO v_household_id
FROM trusted_person tp
WHERE tp.user_id = v_user_id AND tp.status = 'active' AND tp.access_level = 'owner'
LIMIT 1;

IF v_household_id IS NOT NULL THEN
RETURN v_household_id;
END IF;

v_name := COALESCE(NULLIF(TRIM(p_name), ''), 'My Household');

INSERT INTO households (name) VALUES (v_name)
RETURNING id INTO v_household_id;

INSERT INTO trusted_person (
household_id, user_id, name, email,
role, access_level, status,
activated_at
) VALUES (
v_household_id, v_user_id,
COALESCE(p_user_email, split_part(p_user_email, '@', 1), 'Owner'),
COALESCE(p_user_email, ''),
'household', 'owner', 'active',
now()
);

PERFORM seed_sample_data(v_household_id);

RETURN v_household_id;
END;
$function$;
