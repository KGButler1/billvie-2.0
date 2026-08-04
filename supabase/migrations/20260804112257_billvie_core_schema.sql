/*
# Billvie Core Schema — Households, Trusted People, Key People, Access Grants

## Overview
Creates the foundational ownership and access-control layer for Billvie.
Every domain table (bills, events, documents, etc.) will belong to a household,
and access is resolved through a single `can_access()` Postgres function that
mirrors the existing client-side `AccessService.canSee()` logic.

## New Tables

### households
- `id` (uuid, pk) — the household identifier
- `name` (text) — household display name
- `created_at` (timestamptz)
- `sample_data_seeded_at` (timestamptz, nullable) — set once sample data is generated; replaces the old `billvie_sample_shown` localStorage flag

### trusted_person
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `user_id` (uuid, fk -> auth.users, nullable) — null until invite accepted / account created
- `name` (text)
- `email` (text, not null)
- `role` (text) — 'household' | 'advisor' | 'accountant' (existing values preserved)
- `access_level` (text, nullable) — 'owner' | 'co_owner' | 'trusted_person'; only meaningful when role = 'household'. Advisors/accountants get no access_level.
- `status` (text) — 'invited' | 'active' | 'removed'
- `invite_token` (text, nullable)
- `key_person_id` (uuid, fk -> key_people, nullable) — one-way link to KeyPerson
- `invited_at` (timestamptz, nullable)
- `activated_at` (timestamptz, nullable)
- `removed_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### key_people
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `name` (text)
- `relationship` (text)
- `phone` (text, nullable)
- `email` (text, nullable)
- `address` (text, nullable)
- `role` (text, nullable) — free text, e.g. "Has power of attorney"
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### access_grants
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `person_id` (uuid, fk -> trusted_person, not null)
- `scope` (text) — 'bills' | 'documents' | 'events' | 'tax_documents' | 'key_people' | 'financial_info'
- `item_id` (uuid, nullable) — null = whole scope
- `granted_at` (timestamptz)
- `revoked_at` (timestamptz, nullable) — append-only; never delete a grant

## Helper Functions

### is_household_member(p_user_id uuid, p_household_id uuid) -> boolean
Returns true if the user has an active trusted_person row in the household.

### can_access(p_person_id uuid, p_scope text, p_item_id uuid) -> boolean
Single source of truth for shared-viewer access resolution. Mirrors
AccessService.canSee():
- A whole-scope grant (item_id is null) supersedes any item-level grant.
- An item-level grant allows access to that specific item.
- Revoked grants (revoked_at not null) are ignored.
Returns true if any non-revoked grant matches.

### create_household_with_owner(p_name text, p_user_email text) -> uuid
Creates a household, creates the owner's trusted_person row (role='household',
access_level='owner', status='active', user_id set immediately), and seeds
sample bills and events. Returns the household id. Idempotent per user —
if the user already owns a household, returns the existing one.

## Security
- RLS enabled on all four tables immediately.
- trusted_person: members can read/write their own household's rows; shared viewers cannot read trusted_person rows (they only see what access_grants + can_access() allow on domain tables).
- key_people: household members get full CRUD; shared viewers get read-only via can_access('key_people', ...).
- access_grants: household members can read their own household's grants; inserts/updates only by household members; no deletes (append-only history).
- households: members can read their own household; insert via the create_household_with_owner() SECURITY DEFINER function; no updates/deletes from the client.

## Important Notes
1. `create_household_with_owner()` is SECURITY DEFINER so it can insert into
   households + trusted_person and call the sample-data seeder in one
   transaction, even though the caller is a freshly-signed-up user.
2. The sample-data seeding is split into a separate SECURITY DEFINER function
   `seed_sample_data(p_household_id uuid)` so it can be called independently
   and so the migration that creates the domain tables can redefine it later
   without touching the household-creation function. This migration creates
   a stub that does nothing; the domain-tables migration replaces it with
   the real seeder once the tables exist.
3. `access_level` is reserved schema only in this prompt — no co-owner
   behavior is built here, just the column.
*/

-- ============================================================
-- 1. HOUSEHOLDS
-- ============================================================
CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Household',
  created_at timestamptz NOT NULL DEFAULT now(),
  sample_data_seeded_at timestamptz
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. KEY PEOPLE (must exist before trusted_person FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS key_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL DEFAULT 'other',
  phone text,
  email text,
  address text,
  role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_key_people_household ON key_people(household_id);

ALTER TABLE key_people ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. TRUSTED PERSON
-- ============================================================
CREATE TABLE IF NOT EXISTS trusted_person (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'household',
  access_level text,
  status text NOT NULL DEFAULT 'invited',
  invite_token text,
  key_person_id uuid REFERENCES key_people(id) ON DELETE SET NULL,
  invited_at timestamptz,
  activated_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trusted_person_household ON trusted_person(household_id);
CREATE INDEX IF NOT EXISTS idx_trusted_person_user ON trusted_person(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_person_user_active
  ON trusted_person(user_id)
  WHERE user_id IS NOT NULL AND status = 'active';

ALTER TABLE trusted_person ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. ACCESS GRANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES trusted_person(id) ON DELETE CASCADE,
  scope text NOT NULL,
  item_id uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_access_grants_household ON access_grants(household_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_person ON access_grants(person_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_scope ON access_grants(scope);

ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Check if a user is an active member of a household
CREATE OR REPLACE FUNCTION is_household_member(p_user_id uuid, p_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trusted_person
    WHERE user_id = p_user_id
      AND household_id = p_household_id
      AND status = 'active'
  );
$$;

-- Get the household id(s) a user belongs to
CREATE OR REPLACE FUNCTION user_household_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM trusted_person
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;
$$;

-- Single source of truth for shared-viewer access.
-- Mirrors AccessService.canSee(): whole-scope grant supersedes item-level;
-- revoked grants are ignored.
CREATE OR REPLACE FUNCTION can_access(p_person_id uuid, p_scope text, p_item_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM access_grants
    WHERE person_id = p_person_id
      AND scope = p_scope
      AND revoked_at IS NULL
      AND (
        item_id IS NULL                       -- whole-scope grant
        OR (p_item_id IS NOT NULL AND item_id = p_item_id)  -- specific item
      )
  );
$$;

-- Stub seeder — replaced by the domain-tables migration once tables exist.
-- Kept here so create_household_with_owner() can call it without a forward reference.
CREATE OR REPLACE FUNCTION seed_sample_data(p_household_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op stub. The domain-tables migration redefines this once tables exist.
  NULL;
END;
$$;

-- Create a household + owner trusted_person row + seed sample data.
-- Idempotent per user: returns existing household if the user already owns one.
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

  -- Return existing household if this user already has an active owner row
  SELECT tp.household_id INTO v_household_id
  FROM trusted_person tp
  WHERE tp.user_id = v_user_id AND tp.status = 'active'
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

  -- Seed sample data (stub for now; real seeder added in the next migration)
  PERFORM seed_sample_data(v_household_id);

  RETURN v_household_id;
END;
$$;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- ---- households ----
-- Members can read their own household.
DROP POLICY IF EXISTS "members_read_own_household" ON households;
CREATE POLICY "members_read_own_household"
  ON households FOR SELECT
  TO authenticated
  USING (is_household_member(auth.uid(), id));

-- No direct client INSERT/UPDATE/DELETE on households — all through
-- the create_household_with_owner() SECURITY DEFINER function.

-- ---- trusted_person ----
-- Members can read all trusted_person rows in their own household.
DROP POLICY IF EXISTS "members_read_trusted_person" ON trusted_person;
CREATE POLICY "members_read_trusted_person"
  ON trusted_person FOR SELECT
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- Members can insert trusted_person rows into their own household.
DROP POLICY IF EXISTS "members_insert_trusted_person" ON trusted_person;
CREATE POLICY "members_insert_trusted_person"
  ON trusted_person FOR INSERT
  TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

-- Members can update trusted_person rows in their own household.
DROP POLICY IF EXISTS "members_update_trusted_person" ON trusted_person;
CREATE POLICY "members_update_trusted_person"
  ON trusted_person FOR UPDATE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

-- Members can soft-delete (status -> removed) but we still allow DELETE
-- for the owner's own row cleanup if ever needed.
DROP POLICY IF EXISTS "members_delete_trusted_person" ON trusted_person;
CREATE POLICY "members_delete_trusted_person"
  ON trusted_person FOR DELETE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- key_people ----
-- Members get full access; shared viewers get read-only via can_access.
DROP POLICY IF EXISTS "members_read_key_people" ON key_people;
CREATE POLICY "members_read_key_people"
  ON key_people FOR SELECT
  TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND can_access(tp.id, 'key_people', key_people.id)
    )
  );

DROP POLICY IF EXISTS "members_insert_key_people" ON key_people;
CREATE POLICY "members_insert_key_people"
  ON key_people FOR INSERT
  TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "members_update_key_people" ON key_people;
CREATE POLICY "members_update_key_people"
  ON key_people FOR UPDATE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "members_delete_key_people" ON key_people;
CREATE POLICY "members_delete_key_people"
  ON key_people FOR DELETE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- access_grants ----
-- Members can read grants in their own household.
DROP POLICY IF EXISTS "members_read_access_grants" ON access_grants;
CREATE POLICY "members_read_access_grants"
  ON access_grants FOR SELECT
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- Members can create grants in their own household.
DROP POLICY IF EXISTS "members_insert_access_grants" ON access_grants;
CREATE POLICY "members_insert_access_grants"
  ON access_grants FOR INSERT
  TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

-- Members can revoke (set revoked_at) grants in their own household.
DROP POLICY IF EXISTS "members_update_access_grants" ON access_grants;
CREATE POLICY "members_update_access_grants"
  ON access_grants FOR UPDATE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

-- No DELETE policy on access_grants — append-only history.