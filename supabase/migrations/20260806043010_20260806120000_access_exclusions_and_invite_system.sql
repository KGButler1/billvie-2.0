/*
# Access Exclusions + Invite/Accept System + Exclusion-Aware RLS

## Overview
1. Creates the `access_exclusions` table — an append-only log that lets a
   household owner hide specific items (or an entire scope) from an
   otherwise full-access household member.
2. Adds two helper functions: `is_excluded()` and `person_id_for_user()`.
3. Updates every scope-bearing domain table's SELECT policy so the
   household-member branch also checks `NOT is_excluded(...)`.
4. Adds `accept_household_invite(p_token text)` — a SECURITY DEFINER RPC
   that links a newly-authenticated user to the `trusted_person` row whose
   `invite_token` matches, setting `user_id`, `status='active'`,
   `activated_at=now()`.
5. Fixes `create_household_with_owner()` so the "already owns a household"
   check looks for `access_level = 'owner'` instead of any active
   trusted_person row (forward-compatible fix for Phase 2).

## New Tables

### access_exclusions
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `person_id` (uuid, fk -> trusted_person, not null) — the person being excluded
- `scope` (text, not null) — same scope vocabulary as access_grants
- `item_id` (uuid, nullable) — null = whole scope excluded
- `excluded_at` (timestamptz, not null, default now())
- `restored_at` (timestamptz, nullable) — append-only; set when exclusion is lifted

## New Functions

### is_excluded(p_person_id uuid, p_scope text, p_item_id uuid) -> boolean
Returns true if the person is excluded from the scope/item. Whole-scope
exclusion beats item-level. Restored exclusions (restored_at not null)
are ignored.

### person_id_for_user(p_user_id uuid, p_household_id uuid) -> uuid
Returns the caller's own trusted_person.id for the given household, so
RLS can check exclusions against it.

### accept_household_invite(p_token text) -> uuid
SECURITY DEFINER. Given the invite token and the authenticated caller,
links the user to the matching trusted_person row. Returns household_id
on success. Raises exceptions for invalid/used tokens.

## Modified Functions

### create_household_with_owner()
Changed the "already owns a household" check from "any active
trusted_person row" to "an active trusted_person row with
access_level = 'owner'". Forward-compatible fix for Phase 2.

## Security
- RLS enabled on access_exclusions immediately.
- Only household members can read/insert/update access_exclusions.
- Domain table SELECT policies updated so the household-member branch
  also requires NOT is_excluded(...).
- Shared-viewer branches (can_access) are unchanged.
*/

-- ============================================================
-- 1. ACCESS EXCLUSIONS TABLE
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
  SELECT tp.id FROM trusted_person tp
  WHERE tp.user_id = p_user_id
    AND tp.household_id = p_household_id
    AND tp.status = 'active'
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
-- 3. ACCEPT HOUSEHOLD INVITE RPC
-- ============================================================
CREATE OR REPLACE FUNCTION accept_household_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person trusted_person%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_household_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to accept an invite';
  END IF;

  SELECT * INTO v_person
  FROM trusted_person
  WHERE invite_token = p_token
    AND status = 'invited'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invite link isn''t valid — ask them to send it again';
  END IF;

  UPDATE trusted_person
  SET user_id = v_user_id,
      status = 'active',
      activated_at = now(),
      updated_at = now()
  WHERE id = v_person.id;

  v_household_id := v_person.household_id;

  RETURN v_household_id;
END;
$$;

-- ============================================================
-- 4. FIX create_household_with_owner — owner check
-- ============================================================
CREATE OR REPLACE FUNCTION create_household_with_owner(p_name text DEFAULT NULL, p_user_email text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id uuid;
  v_user_id uuid := auth.uid();
  v_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'create_household_with_owner requires an authenticated user';
  END IF;

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
$$;

-- ============================================================
-- 5. RLS POLICIES FOR access_exclusions
-- ============================================================
DROP POLICY IF EXISTS "members_read_access_exclusions" ON access_exclusions;
CREATE POLICY "members_read_access_exclusions"
  ON access_exclusions FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "members_insert_access_exclusions" ON access_exclusions;
CREATE POLICY "members_insert_access_exclusions"
  ON access_exclusions FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "members_update_access_exclusions" ON access_exclusions;
CREATE POLICY "members_update_access_exclusions"
  ON access_exclusions FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

-- ============================================================
-- 6. UPDATE DOMAIN TABLE SELECT POLICIES (exclusion-aware)
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

-- ---- event_expenses ----
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

-- ---- financial_superannuation ----
DROP POLICY IF EXISTS "read_financial_superannuation" ON financial_superannuation;
CREATE POLICY "read_financial_superannuation"
  ON financial_superannuation FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
     AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_superannuation.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_superannuation.id)
    )
  );

-- ---- financial_income ----
DROP POLICY IF EXISTS "read_financial_income" ON financial_income;
CREATE POLICY "read_financial_income"
  ON financial_income FOR SELECT TO authenticated
  USING (
    (is_household_member(auth.uid(), household_id)
     AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_income.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_income.id)
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
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'key_people', key_people.id)
    )
  );
