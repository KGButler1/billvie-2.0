/*
# Domain-table writes: admin-only lockdown

## Purpose
The prior migration (..._sharing_permissions_rls_lockdown.sql) fixed the
SELECT policies on all domain tables so only is_household_admin() gets
default read access. The INSERT/UPDATE/DELETE policies were left untouched
and still authorize on is_household_member() — meaning any household
member (trusted person, advisor, accountant) can create, edit, or delete
bills, documents, events, financial records, tax documents, and key
contacts regardless of their access level or grants.

This migration replaces those write policies to call is_household_admin()
instead of is_household_member(). SELECT policies are not touched.

## Scope
Tables: bills, events, event_expenses, documents, financial_insurance,
financial_superannuation, financial_income, financial_debts,
financial_misc, tax_documents, key_people.

Out of scope (flagged separately): payment_cards, bank_accounts,
bill_person_tags, document_person_tags, document_links, tax_tags.

## Security
- No new tables, no column changes, no data loss.
- is_household_admin() is already defined from the prior migration.
- All policies remain TO authenticated.
*/

-- ---- bills ----
DROP POLICY IF EXISTS "insert_bills" ON bills;
CREATE POLICY "insert_bills"
  ON bills FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_bills" ON bills;
CREATE POLICY "update_bills"
  ON bills FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_bills" ON bills;
CREATE POLICY "delete_bills"
  ON bills FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- events ----
DROP POLICY IF EXISTS "insert_events" ON events;
CREATE POLICY "insert_events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_events" ON events;
CREATE POLICY "update_events"
  ON events FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_events" ON events;
CREATE POLICY "delete_events"
  ON events FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- event_expenses ----
DROP POLICY IF EXISTS "insert_event_expenses" ON event_expenses;
CREATE POLICY "insert_event_expenses"
  ON event_expenses FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_event_expenses" ON event_expenses;
CREATE POLICY "update_event_expenses"
  ON event_expenses FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_event_expenses" ON event_expenses;
CREATE POLICY "delete_event_expenses"
  ON event_expenses FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- documents ----
DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents"
  ON documents FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents"
  ON documents FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- financial_insurance ----
DROP POLICY IF EXISTS "insert_financial_insurance" ON financial_insurance;
CREATE POLICY "insert_financial_insurance"
  ON financial_insurance FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_insurance" ON financial_insurance;
CREATE POLICY "update_financial_insurance"
  ON financial_insurance FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_insurance" ON financial_insurance;
CREATE POLICY "delete_financial_insurance"
  ON financial_insurance FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- financial_superannuation ----
DROP POLICY IF EXISTS "insert_financial_superannuation" ON financial_superannuation;
CREATE POLICY "insert_financial_superannuation"
  ON financial_superannuation FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_superannuation" ON financial_superannuation;
CREATE POLICY "update_financial_superannuation"
  ON financial_superannuation FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_superannuation" ON financial_superannuation;
CREATE POLICY "delete_financial_superannuation"
  ON financial_superannuation FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- financial_income ----
DROP POLICY IF EXISTS "insert_financial_income" ON financial_income;
CREATE POLICY "insert_financial_income"
  ON financial_income FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_income" ON financial_income;
CREATE POLICY "update_financial_income"
  ON financial_income FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_income" ON financial_income;
CREATE POLICY "delete_financial_income"
  ON financial_income FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- financial_debts ----
DROP POLICY IF EXISTS "insert_financial_debts" ON financial_debts;
CREATE POLICY "insert_financial_debts"
  ON financial_debts FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_debts" ON financial_debts;
CREATE POLICY "update_financial_debts"
  ON financial_debts FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_debts" ON financial_debts;
CREATE POLICY "delete_financial_debts"
  ON financial_debts FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- financial_misc ----
DROP POLICY IF EXISTS "insert_financial_misc" ON financial_misc;
CREATE POLICY "insert_financial_misc"
  ON financial_misc FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_misc" ON financial_misc;
CREATE POLICY "update_financial_misc"
  ON financial_misc FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_misc" ON financial_misc;
CREATE POLICY "delete_financial_misc"
  ON financial_misc FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- tax_documents ----
DROP POLICY IF EXISTS "insert_tax_documents" ON tax_documents;
CREATE POLICY "insert_tax_documents"
  ON tax_documents FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_tax_documents" ON tax_documents;
CREATE POLICY "update_tax_documents"
  ON tax_documents FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_tax_documents" ON tax_documents;
CREATE POLICY "delete_tax_documents"
  ON tax_documents FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ---- key_people ----
DROP POLICY IF EXISTS "members_insert_key_people" ON key_people;
CREATE POLICY "members_insert_key_people"
  ON key_people FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "members_update_key_people" ON key_people;
CREATE POLICY "members_update_key_people"
  ON key_people FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "members_delete_key_people" ON key_people;
CREATE POLICY "members_delete_key_people"
  ON key_people FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));
