/*
# Sharing & Permissions: RLS Lockdown + Co-Owner Support

## Purpose
Fix critical security gaps in the sharing/permissions model:
1. Any household member could write to access_grants, access_exclusions, and
   trusted_person (including self-promoting to owner).
2. Domain-table SELECT policies granted full access to any household member
   via is_household_member() alone — access_grants were never consulted.
3. access_exclusions had 6 overlapping policies (members_* + owner_*), with
   the permissive set silently winning.

## Changes

### 1a. Widen access_level + backfill
- Add CHECK constraint on trusted_person.access_level allowing only
  NULL, 'owner', 'co_owner', 'trusted_person'.
- Backfill: set access_level = 'trusted_person' for all rows where
  role = 'household' AND access_level IS NULL AND status != 'removed'.
  Owner rows already have access_level = 'owner' — untouched.

### 1b. Two new helper functions
- is_household_owner(user_id, household_id): true if user has an active
  row with access_level = 'owner' in that household.
- is_household_admin(user_id, household_id): true if user has an active
  row with access_level IN ('owner', 'co_owner') in that household.

### 1c. trusted_person write policies locked down
- INSERT: must be admin AND cannot create an 'owner' row.
- UPDATE: admin can update any row EXCEPT an 'owner' row, unless the
  caller IS that owner (self-update). Co-owners cannot touch the owner.
- DELETE: same protection as UPDATE (defense in depth).
- SELECT: unchanged (full household read visibility is intentional).

### 1d. access_grants write policies locked down
- INSERT and UPDATE now require is_household_admin instead of
  is_household_member. SELECT unchanged.

### 1e. access_exclusions cleanup
- DROP the three permissive members_*_access_exclusions policies.
- Update the three owner_*_access_exclusions policies to use
  is_household_admin() instead of inline access_level = 'owner' check,
  so co-owners can also manage exclusions.

### 1f. Domain-table SELECT policies fixed
- For bills, events, event_expenses, documents, financial_insurance,
  financial_superannuation, financial_income, financial_debts,
  financial_misc, tax_documents, key_people: replace the
  is_household_member() branch with is_household_admin() so only
  owners and co-owners get default full access. Trusted people only
  see what their access_grants explicitly allow.

## Security
- No new tables, no column adds/removes, no data loss.
- All policies remain TO authenticated.
- create_household_with_owner() is SECURITY DEFINER and bypasses RLS,
  so it's unaffected by the INSERT policy change.
*/

-- ============================================================
-- 1a. Widen access_level + backfill
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trusted_person_access_level_check'
      AND conrelid = 'trusted_person'::regclass
  ) THEN
    ALTER TABLE trusted_person
      ADD CONSTRAINT trusted_person_access_level_check
      CHECK (access_level IS NULL OR access_level IN ('owner', 'co_owner', 'trusted_person'));
  END IF;
END $$;

UPDATE trusted_person
SET access_level = 'trusted_person', updated_at = now()
WHERE role = 'household'
  AND access_level IS NULL
  AND status != 'removed';

-- ============================================================
-- 1b. Helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION is_household_owner(p_user_id uuid, p_household_id uuid)
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
      AND access_level = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION is_household_admin(p_user_id uuid, p_household_id uuid)
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
      AND access_level IN ('owner', 'co_owner')
  );
$$;

-- ============================================================
-- 1c. trusted_person write policies
-- ============================================================

DROP POLICY IF EXISTS "members_insert_trusted_person" ON trusted_person;
CREATE POLICY "members_insert_trusted_person"
  ON trusted_person FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    AND access_level IS DISTINCT FROM 'owner'
  );

DROP POLICY IF EXISTS "members_update_trusted_person" ON trusted_person;
CREATE POLICY "members_update_trusted_person"
  ON trusted_person FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    AND (access_level IS DISTINCT FROM 'owner' OR is_household_owner(auth.uid(), household_id))
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    AND (access_level IS DISTINCT FROM 'owner' OR is_household_owner(auth.uid(), household_id))
  );

DROP POLICY IF EXISTS "members_delete_trusted_person" ON trusted_person;
CREATE POLICY "members_delete_trusted_person"
  ON trusted_person FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    AND (access_level IS DISTINCT FROM 'owner' OR is_household_owner(auth.uid(), household_id))
  );

-- ============================================================
-- 1d. access_grants write policies
-- ============================================================

DROP POLICY IF EXISTS "members_insert_access_grants" ON access_grants;
CREATE POLICY "members_insert_access_grants"
  ON access_grants FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "members_update_access_grants" ON access_grants;
CREATE POLICY "members_update_access_grants"
  ON access_grants FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

-- ============================================================
-- 1e. access_exclusions cleanup
-- ============================================================

-- Drop the permissive members_* policies (they were winning over owner_*)
DROP POLICY IF EXISTS "members_read_access_exclusions" ON access_exclusions;
DROP POLICY IF EXISTS "members_insert_access_exclusions" ON access_exclusions;
DROP POLICY IF EXISTS "members_update_access_exclusions" ON access_exclusions;

-- Replace owner_* with admin-scoped versions
DROP POLICY IF EXISTS "owner_read_access_exclusions" ON access_exclusions;
CREATE POLICY "owner_read_access_exclusions"
  ON access_exclusions FOR SELECT TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "owner_insert_access_exclusions" ON access_exclusions;
CREATE POLICY "owner_insert_access_exclusions"
  ON access_exclusions FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "owner_update_access_exclusions" ON access_exclusions;
CREATE POLICY "owner_update_access_exclusions"
  ON access_exclusions FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

-- ============================================================
-- 1f. Domain-table SELECT policies: is_household_member → is_household_admin
-- ============================================================

-- bills
DROP POLICY IF EXISTS "read_bills" ON bills;
CREATE POLICY "read_bills"
  ON bills FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'bills', bills.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'bills', bills.id)
    )
  );

-- events
DROP POLICY IF EXISTS "read_events" ON events;
CREATE POLICY "read_events"
  ON events FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'events', events.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'events', events.id)
    )
  );

-- event_expenses
DROP POLICY IF EXISTS "read_event_expenses" ON event_expenses;
CREATE POLICY "read_event_expenses"
  ON event_expenses FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'events', event_expenses.event_id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'events', event_expenses.event_id)
    )
  );

-- documents
DROP POLICY IF EXISTS "read_documents" ON documents;
CREATE POLICY "read_documents"
  ON documents FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'documents', documents.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'documents', documents.id)
    )
  );

-- financial_insurance
DROP POLICY IF EXISTS "read_financial_insurance" ON financial_insurance;
CREATE POLICY "read_financial_insurance"
  ON financial_insurance FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_insurance.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_insurance.id)
    )
  );

-- financial_superannuation
DROP POLICY IF EXISTS "read_financial_superannuation" ON financial_superannuation;
CREATE POLICY "read_financial_superannuation"
  ON financial_superannuation FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_superannuation.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_superannuation.id)
    )
  );

-- financial_income
DROP POLICY IF EXISTS "read_financial_income" ON financial_income;
CREATE POLICY "read_financial_income"
  ON financial_income FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_income.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_income.id)
    )
  );

-- financial_debts
DROP POLICY IF EXISTS "read_financial_debts" ON financial_debts;
CREATE POLICY "read_financial_debts"
  ON financial_debts FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_debts.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_debts.id)
    )
  );

-- financial_misc
DROP POLICY IF EXISTS "read_financial_misc" ON financial_misc;
CREATE POLICY "read_financial_misc"
  ON financial_misc FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'financial_info', financial_misc.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_misc.id)
    )
  );

-- tax_documents
DROP POLICY IF EXISTS "read_tax_documents" ON tax_documents;
CREATE POLICY "read_tax_documents"
  ON tax_documents FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'tax_documents', tax_documents.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'tax_documents', tax_documents.id)
    )
  );

-- key_people
DROP POLICY IF EXISTS "members_read_key_people" ON key_people;
CREATE POLICY "members_read_key_people"
  ON key_people FOR SELECT TO authenticated
  USING (
    (is_household_admin(auth.uid(), household_id)
      AND NOT is_excluded(person_id_for_user(auth.uid(), household_id), 'key_people', key_people.id))
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND can_access(tp.id, 'key_people', key_people.id)
    )
  );
