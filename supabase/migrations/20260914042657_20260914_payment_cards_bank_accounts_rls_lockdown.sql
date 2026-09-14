/*
# RLS lockdown: payment_cards and bank_accounts

## Background
These two tables were deliberately left out of the two prior lockdown
migrations (20260913204757 and 20260913224936) and still authorize
every policy — read and write — on is_household_member() alone. That
means any trusted person, advisor, or accountant in the household can
currently edit or delete payment cards and bank accounts. This migration
closes that gap.

## Changes

### 1. Read policies (SELECT)

Cards and accounts are reference labels only — nickname, optional
institution, optional last digits, expiry, notes. No card numbers, no
credentials. They are meaningless in isolation and required to render
bills and financial items correctly (otherwise a shared viewer sees
"paid from —"). So reads are gated on having any reason to see them,
not on per-item grants:

- Household admins (owners + co-owners) can always read.
- Trusted persons with an active access_grant for 'bills' or
  'financial_info' can read, because they need the card/account labels
  to render the bills and financial items they can already see.

Why a direct access_grants join rather than can_access():
  can_access(person_id, 'bills', NULL) only matches whole-scope grants
  (item_id IS NULL); a person holding item-level grants would fail it
  and lose the ability to read the card label on a bill they legitimately
  have access to. The direct join on access_grants covers both whole-
  scope and item-level grants.

Deliberate simplification: the read policy does not evaluate
is_excluded(). A card row reveals nothing about what it pays — the
linked counts and lists in the UI are derived client-side from the
already-RLS-filtered BillService and FinancialInfoService, so an
excluded viewer naturally sees fewer linked items without needing the
reference row itself hidden. Tightening further would break legitimate
viewers for no privacy gain.

### 2. Write policies (INSERT, UPDATE, DELETE)

All three move to is_household_admin(auth.uid(), household_id) —
exactly matching the domain-table write lockdown migration
(20260913224936). Owners and co-owners only.

### 3. Tables affected
- payment_cards
- bank_accounts

### 4. Constraints
- No new tables, no column additions, no data migration, no data loss.
- All policies remain TO authenticated.
- is_household_admin() already exists — not redefined.
- Explicitly out of scope (still on old pattern, flagged separately):
  bill_person_tags, document_person_tags, document_links, tax_tags.
*/

-- ============================================================
-- payment_cards
-- ============================================================

-- Drop old member-only policies
DROP POLICY IF EXISTS "members_read_payment_cards" ON payment_cards;
DROP POLICY IF EXISTS "members_insert_payment_cards" ON payment_cards;
DROP POLICY IF EXISTS "members_update_payment_cards" ON payment_cards;
DROP POLICY IF EXISTS "members_delete_payment_cards" ON payment_cards;
-- Also drop any legacy-named policies
DROP POLICY IF EXISTS "read_payment_cards" ON payment_cards;
DROP POLICY IF EXISTS "insert_payment_cards" ON payment_cards;
DROP POLICY IF EXISTS "update_payment_cards" ON payment_cards;
DROP POLICY IF EXISTS "delete_payment_cards" ON payment_cards;

-- SELECT: admins OR trusted persons with bills/financial_info grant
CREATE POLICY "read_payment_cards"
  ON payment_cards FOR SELECT TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1
      FROM trusted_person tp
      JOIN access_grants g ON g.person_id = tp.id AND g.revoked_at IS NULL
      WHERE tp.user_id = auth.uid()
        AND tp.household_id = payment_cards.household_id
        AND tp.status = 'active'
        AND g.scope IN ('bills', 'financial_info')
    )
  );

-- INSERT: admins only
CREATE POLICY "insert_payment_cards"
  ON payment_cards FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

-- UPDATE: admins only
CREATE POLICY "update_payment_cards"
  ON payment_cards FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

-- DELETE: admins only
CREATE POLICY "delete_payment_cards"
  ON payment_cards FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ============================================================
-- bank_accounts
-- ============================================================

-- Drop old member-only policies
DROP POLICY IF EXISTS "members_read_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "members_insert_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "members_update_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "members_delete_bank_accounts" ON bank_accounts;
-- Also drop any legacy-named policies
DROP POLICY IF EXISTS "read_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "insert_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "update_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "delete_bank_accounts" ON bank_accounts;

-- SELECT: admins OR trusted persons with bills/financial_info grant
CREATE POLICY "read_bank_accounts"
  ON bank_accounts FOR SELECT TO authenticated
  USING (
    is_household_admin(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1
      FROM trusted_person tp
      JOIN access_grants g ON g.person_id = tp.id AND g.revoked_at IS NULL
      WHERE tp.user_id = auth.uid()
        AND tp.household_id = bank_accounts.household_id
        AND tp.status = 'active'
        AND g.scope IN ('bills', 'financial_info')
    )
  );

-- INSERT: admins only
CREATE POLICY "insert_bank_accounts"
  ON bank_accounts FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

-- UPDATE: admins only
CREATE POLICY "update_bank_accounts"
  ON bank_accounts FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

-- DELETE: admins only
CREATE POLICY "delete_bank_accounts"
  ON bank_accounts FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));