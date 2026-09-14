/*
# Per-person edit rights (can_edit flag)

## Purpose
Add a single boolean flag to trusted_person that, when true, allows a
trusted person / advisor / accountant to make changes (insert, update,
delete) within whatever scopes they're already granted to see. Off by
default. Owner and co-owner are unaffected — they always have full access.

## 1. Schema
- Add column `can_edit boolean NOT NULL DEFAULT false` to trusted_person.
  No backfill needed — false is the correct default for all existing rows.

## 2. Write policies
For each of bills, events, event_expenses, documents, financial_insurance,
financial_superannuation, financial_income, financial_debts,
financial_misc, tax_documents, key_people — extend the existing
admin-only INSERT/UPDATE/DELETE policies (from the prior write-lockdown
migration) to also allow a trusted person with can_edit = true who has
can_access() to the row's scope. The admin branch (is_household_admin) is
kept as-is via OR; the new branch reuses can_access() exactly as the
SELECT policies already do, so can_edit is a multiplier on existing
visibility, never a separate grant.

Scope mapping (same as each table's existing SELECT policy):
- bills → 'bills', bills.id
- events → 'events', events.id
- event_expenses → 'events', event_expenses.event_id
- documents → 'documents', documents.id
- financial_insurance → 'financial_info', financial_insurance.id
- financial_superannuation → 'financial_info', financial_superannuation.id
- financial_income → 'financial_info', financial_income.id
- financial_debts → 'financial_info', financial_debts.id
- financial_misc → 'financial_info', financial_misc.id
- tax_documents → 'tax_documents', tax_documents.id
- key_people → 'key_people', key_people.id

## Security
- No data loss, no column removals, no table renames.
- All policies remain TO authenticated.
- SELECT policies are not touched.
- can_edit only grants write access to rows the person can already see
  (can_access must return true). It never grants visibility on its own.
*/

-- ============================================================
-- 1. Add can_edit column
-- ============================================================

ALTER TABLE trusted_person
  ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Extend write policies with can_edit branch
-- ============================================================

-- ---- bills ----
DROP POLICY IF EXISTS "insert_bills" ON bills;
CREATE POLICY "insert_bills"
  ON bills FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'bills', bills.id)
    )
  );

DROP POLICY IF EXISTS "update_bills" ON bills;
CREATE POLICY "update_bills"
  ON bills FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'bills', bills.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'bills', bills.id)
    )
  );

DROP POLICY IF EXISTS "delete_bills" ON bills;
CREATE POLICY "delete_bills"
  ON bills FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'bills', bills.id)
    )
  );

-- ---- events ----
DROP POLICY IF EXISTS "insert_events" ON events;
CREATE POLICY "insert_events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'events', events.id)
    )
  );

DROP POLICY IF EXISTS "update_events" ON events;
CREATE POLICY "update_events"
  ON events FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'events', events.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'events', events.id)
    )
  );

DROP POLICY IF EXISTS "delete_events" ON events;
CREATE POLICY "delete_events"
  ON events FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'events', events.id)
    )
  );

-- ---- event_expenses ----
DROP POLICY IF EXISTS "insert_event_expenses" ON event_expenses;
CREATE POLICY "insert_event_expenses"
  ON event_expenses FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'events', event_expenses.event_id)
    )
  );

DROP POLICY IF EXISTS "update_event_expenses" ON event_expenses;
CREATE POLICY "update_event_expenses"
  ON event_expenses FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'events', event_expenses.event_id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'events', event_expenses.event_id)
    )
  );

DROP POLICY IF EXISTS "delete_event_expenses" ON event_expenses;
CREATE POLICY "delete_event_expenses"
  ON event_expenses FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'events', event_expenses.event_id)
    )
  );

-- ---- documents ----
DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'documents', documents.id)
    )
  );

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents"
  ON documents FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'documents', documents.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'documents', documents.id)
    )
  );

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents"
  ON documents FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'documents', documents.id)
    )
  );

-- ---- financial_insurance ----
DROP POLICY IF EXISTS "insert_financial_insurance" ON financial_insurance;
CREATE POLICY "insert_financial_insurance"
  ON financial_insurance FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_insurance.id)
    )
  );

DROP POLICY IF EXISTS "update_financial_insurance" ON financial_insurance;
CREATE POLICY "update_financial_insurance"
  ON financial_insurance FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_insurance.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_insurance.id)
    )
  );

DROP POLICY IF EXISTS "delete_financial_insurance" ON financial_insurance;
CREATE POLICY "delete_financial_insurance"
  ON financial_insurance FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_insurance.id)
    )
  );

-- ---- financial_superannuation ----
DROP POLICY IF EXISTS "insert_financial_superannuation" ON financial_superannuation;
CREATE POLICY "insert_financial_superannuation"
  ON financial_superannuation FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_superannuation.id)
    )
  );

DROP POLICY IF EXISTS "update_financial_superannuation" ON financial_superannuation;
CREATE POLICY "update_financial_superannuation"
  ON financial_superannuation FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_superannuation.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_superannuation.id)
    )
  );

DROP POLICY IF EXISTS "delete_financial_superannuation" ON financial_superannuation;
CREATE POLICY "delete_financial_superannuation"
  ON financial_superannuation FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_superannuation.id)
    )
  );

-- ---- financial_income ----
DROP POLICY IF EXISTS "insert_financial_income" ON financial_income;
CREATE POLICY "insert_financial_income"
  ON financial_income FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_income.id)
    )
  );

DROP POLICY IF EXISTS "update_financial_income" ON financial_income;
CREATE POLICY "update_financial_income"
  ON financial_income FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_income.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_income.id)
    )
  );

DROP POLICY IF EXISTS "delete_financial_income" ON financial_income;
CREATE POLICY "delete_financial_income"
  ON financial_income FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_income.id)
    )
  );

-- ---- financial_debts ----
DROP POLICY IF EXISTS "insert_financial_debts" ON financial_debts;
CREATE POLICY "insert_financial_debts"
  ON financial_debts FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_debts.id)
    )
  );

DROP POLICY IF EXISTS "update_financial_debts" ON financial_debts;
CREATE POLICY "update_financial_debts"
  ON financial_debts FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_debts.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_debts.id)
    )
  );

DROP POLICY IF EXISTS "delete_financial_debts" ON financial_debts;
CREATE POLICY "delete_financial_debts"
  ON financial_debts FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_debts.id)
    )
  );

-- ---- financial_misc ----
DROP POLICY IF EXISTS "insert_financial_misc" ON financial_misc;
CREATE POLICY "insert_financial_misc"
  ON financial_misc FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_misc.id)
    )
  );

DROP POLICY IF EXISTS "update_financial_misc" ON financial_misc;
CREATE POLICY "update_financial_misc"
  ON financial_misc FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_misc.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_misc.id)
    )
  );

DROP POLICY IF EXISTS "delete_financial_misc" ON financial_misc;
CREATE POLICY "delete_financial_misc"
  ON financial_misc FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'financial_info', financial_misc.id)
    )
  );

-- ---- tax_documents ----
DROP POLICY IF EXISTS "insert_tax_documents" ON tax_documents;
CREATE POLICY "insert_tax_documents"
  ON tax_documents FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'tax_documents', tax_documents.id)
    )
  );

DROP POLICY IF EXISTS "update_tax_documents" ON tax_documents;
CREATE POLICY "update_tax_documents"
  ON tax_documents FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'tax_documents', tax_documents.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'tax_documents', tax_documents.id)
    )
  );

DROP POLICY IF EXISTS "delete_tax_documents" ON tax_documents;
CREATE POLICY "delete_tax_documents"
  ON tax_documents FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'tax_documents', tax_documents.id)
    )
  );

-- ---- key_people ----
DROP POLICY IF EXISTS "members_insert_key_people" ON key_people;
CREATE POLICY "members_insert_key_people"
  ON key_people FOR INSERT TO authenticated
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'key_people', key_people.id)
    )
  );

DROP POLICY IF EXISTS "members_update_key_people" ON key_people;
CREATE POLICY "members_update_key_people"
  ON key_people FOR UPDATE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'key_people', key_people.id)
    )
  )
  WITH CHECK (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'key_people', key_people.id)
    )
  );

DROP POLICY IF EXISTS "members_delete_key_people" ON key_people;
CREATE POLICY "members_delete_key_people"
  ON key_people FOR DELETE TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid()
        AND tp.status = 'active'
        AND tp.can_edit = true
        AND can_access(tp.id, 'key_people', key_people.id)
    )
  );
