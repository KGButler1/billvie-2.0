/*
# Multi-household support: relax unique constraint + add my_households() RPC

## Purpose
Allow one person to belong to multiple households simultaneously (e.g. their own
plus a parent's or partner's). The old unique index on (user_id) WHERE status='active'
blocked this — only one active trusted_person row per user was permitted.

## Changes

### 1. Index change on trusted_person
- DROP the old `idx_trusted_person_user_active` unique index (unique on user_id
  alone, active rows only).
- CREATE a new `idx_trusted_person_user_household_active` unique index on
  (user_id, household_id) for active rows. This allows the same user to be
  active in multiple households, while still preventing duplicate memberships
  in the same household.

### 2. New RPC: my_households()
- Returns a table of (household_id, household_name, role, access_level, plan_status)
  for every household the signed-in user is currently active in.
- SECURITY DEFINER, STABLE, search_path = public.
- Ordered by household creation date (oldest first).

### 3. Fix create_household_with_owner()
- The existing function returned the first active household if the user had any,
  preventing users who are trusted (non-owner) members of someone else's household
  from creating their own. Changed the existing-household check to only return
  early when the user already owns a household (access_level = 'owner').

## Security
- No RLS policy changes — all policies already use is_household_member(auth.uid(),
  household_id) which correctly checks per (user_id, household_id).
- The new RPC is SECURITY DEFINER and only returns rows for auth.uid().
- No new tables, no column changes, no data loss.
*/

-- 1. Replace the unique index
DROP INDEX IF EXISTS idx_trusted_person_user_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_person_user_household_active
  ON trusted_person(user_id, household_id)
  WHERE user_id IS NOT NULL AND status = 'active';

-- 2. New RPC: list all households for the signed-in user
CREATE OR REPLACE FUNCTION my_households()
RETURNS TABLE(
  household_id uuid,
  household_name text,
  role text,
  access_level text,
  plan_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.id, h.name, tp.role, tp.access_level, h.plan_status
  FROM trusted_person tp
  JOIN households h ON h.id = tp.household_id
  WHERE tp.user_id = auth.uid() AND tp.status = 'active'
  ORDER BY h.created_at;
$$;

-- 3. Fix create_household_with_owner to only return early if the user already OWNS a household
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

  -- Return existing household only if this user already owns one
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
