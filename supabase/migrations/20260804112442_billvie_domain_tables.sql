/*
# Billvie Domain Tables — Bills, Events, Documents, Financial, Tax, Payment Cards

## Overview
Creates all domain tables that belong to a household, adds RLS policies
(household members get full CRUD; shared viewers get read-only via can_access()),
and replaces the stub `seed_sample_data()` with the real seeder that generates
the same sample bills and events as the existing localStorage prototype.

## New Tables

### bills
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `name` (text, not null)
- `amount` (numeric, nullable)
- `due_date` (timestamptz, nullable)
- `is_recurring` (boolean, default false)
- `recurring_interval` (text, nullable) — 'one_time'|'weekly'|'biweekly'|'monthly'|'quarterly'|'yearly'|'custom'
- `payment_method` (text, nullable)
- `payment_card_id` (uuid, fk -> payment_cards, nullable)
- `category` (text, nullable)
- `notes` (text, nullable)
- `is_auto_debited` (boolean, default false)
- `status` (text, default 'pending') — 'pending'|'paid'|'overdue'|'due_soon'
- `paid_date` (timestamptz, nullable)
- `is_sample` (boolean, default false)
- `deleted_at` (timestamptz, nullable) — soft delete, 30-day restore
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### bill_person_tags (join table — wayfinding only, never access)
- `bill_id` (uuid, fk -> bills, not null)
- `person_id` (uuid, fk -> trusted_person, not null)
- PK on (bill_id, person_id)

### payment_cards
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `nickname` (text, not null)
- `expiry_month` (int, nullable)
- `expiry_year` (int, nullable)
- `notes` (text, nullable)
- `archived_at` (timestamptz, nullable) — soft-archive
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### events
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `name` (text, not null)
- `type` (text, default 'custom') — 'travel'|'wedding'|'moving'|'renovation'|'birthday'|'custom'
- `budget` (numeric, nullable)
- `start_date` (timestamptz, nullable)
- `end_date` (timestamptz, nullable)
- `status` (text, default 'planning') — 'planning'|'active'|'completed'|'archived'
- `is_sample` (boolean, default false)
- `deleted_at` (timestamptz, nullable) — soft delete
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### event_expenses
- `id` (uuid, pk)
- `event_id` (uuid, fk -> events ON DELETE CASCADE, not null)
- `household_id` (uuid, fk -> households, not null) — denormalized for RLS simplicity
- `name` (text, not null)
- `description` (text, nullable)
- `vendor` (text, nullable)
- `amount` (numeric, not null default 0)
- `quantity_value` (numeric, nullable)
- `quantity_unit` (text, nullable)
- `category` (text, not null default 'General')
- `date` (timestamptz, nullable)
- `payment_method` (text, nullable)
- `is_paid` (boolean, default false)
- `paid_date` (timestamptz, nullable)
- `is_cancellable` (text, default 'no') — 'yes'|'no'|'tbd'
- `cancellation_notes` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### documents
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `title` (text, not null)
- `provider` (text, not null default '')
- `type` (text, default 'other') — 'insurance'|'investment'|'account'|'superannuation'|'will'|'other'
- `key_detail` (text, nullable)
- `notes` (text, nullable)
- `external_link` (text, nullable)
- `physical_location` (text, nullable)
- `important_date` (timestamptz, nullable)
- `important_date_label` (text, nullable)
- `deleted_at` (timestamptz, nullable) — soft delete
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### document_person_tags (join table — wayfinding only, never access)
- `document_id` (uuid, fk -> documents, not null)
- `person_id` (uuid, fk -> trusted_person, not null)
- PK on (document_id, person_id)

### financial_insurance
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `provider` (text, not null)
- `policy_number` (text, nullable)
- `type` (text, default 'other') — 'auto'|'home'|'life'|'health'|'travel'|'other'
- `premium` (numeric, nullable)
- `premium_frequency` (text, nullable) — 'monthly'|'quarterly'|'annual'
- `renewal_date` (timestamptz, nullable)
- `document_link` (text, nullable)
- `notes` (text, nullable)
- `linked_bill_id` (uuid, fk -> bills, nullable)
- `contact_info` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### financial_superannuation
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `fund_name` (text, not null)
- `account_number` (text, nullable)
- `estimated_balance` (numeric, not null default 0)
- `notes` (text, nullable)
- `contact_info` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### financial_income
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `source_name` (text, not null)
- `approximate_amount` (numeric, not null default 0)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### financial_debts
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `owed_to` (text, not null)
- `type` (text, default 'other') — 'mortgage'|'car'|'personal'|'other'
- `approximate_balance` (numeric, not null default 0)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### financial_misc
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `key` (text, not null)
- `value` (text, not null)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### tax_documents
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `name` (text, not null)
- `categories` (text[], default '{}')
- `year` (int, not null)
- `amount` (numeric, nullable)
- `notes` (text, nullable)
- `is_tax_relevant` (boolean, default true)
- `deleted_at` (timestamptz, nullable) — soft delete
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### document_links
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `document_id` (uuid, fk -> documents, not null) — source item
- `source_type` (text, default 'document') — 'document'|'tax_document'
- `link_type` (text, not null) — 'bill'|'document'
- `target_id` (uuid, not null) — billId or documentId
- `linked_at` (timestamptz, default now())
- `unlinked_at` (timestamptz, nullable) — append-only history

### tax_tags
- `id` (uuid, pk)
- `household_id` (uuid, fk -> households, not null)
- `item_id` (uuid, not null) — bill id or document id
- `item_type` (text, not null) — 'bill'|'document'
- `tax_year` (int, not null)
- `categories` (text[], default '{}')
- `tax_type` (text, nullable) — 'personal'|'business'
- `business_name` (text, nullable)
- `origin` (text, default 'direct') — 'direct'|'carried'
- `carried_from_year` (int, nullable)
- `tagged_at` (timestamptz, default now())
- `untagged_at` (timestamptz, nullable) — append-only history

## Security
- RLS enabled on every table.
- Household members (active trusted_person with matching user_id) get full CRUD.
- Shared viewers (non-members with access_grants) get read-only on bills, events,
  documents, tax_documents, key_people, and financial_* tables via can_access().
- No policy = no access. All tables default deny.
- bill_person_tags and document_person_tags are wayfinding only — they never
  grant any access, and only household members can read/write them.

## Sample Data Seeder
Replaces the stub `seed_sample_data()` with the real implementation:
- Three sample bills (Electric Bill, Internet Service, Phone Plan) with same
  amounts and relative due dates as the localStorage prototype, is_sample = true.
- Two sample events (Family Trip to Hawaii, Birthday Party) with expenses,
  is_sample = true.
- Sets households.sample_data_seeded_at = now() once done.
- Idempotent: does nothing if sample_data_seeded_at is already set.
*/

-- ============================================================
-- PAYMENT CARDS (before bills FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  expiry_month int,
  expiry_year int,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_cards_household ON payment_cards(household_id);
ALTER TABLE payment_cards ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric,
  due_date timestamptz,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_interval text,
  payment_method text,
  payment_card_id uuid REFERENCES payment_cards(id) ON DELETE SET NULL,
  category text,
  notes text,
  is_auto_debited boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  paid_date timestamptz,
  is_sample boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bills_household ON bills(household_id);
CREATE INDEX IF NOT EXISTS idx_bills_deleted ON bills(deleted_at);
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- bill_person_tags — wayfinding only, never access
CREATE TABLE IF NOT EXISTS bill_person_tags (
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES trusted_person(id) ON DELETE CASCADE,
  PRIMARY KEY (bill_id, person_id)
);
ALTER TABLE bill_person_tags ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- EVENTS + EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'custom',
  budget numeric,
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'planning',
  is_sample boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_household ON events(household_id);
CREATE INDEX IF NOT EXISTS idx_events_deleted ON events(deleted_at);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS event_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  vendor text,
  amount numeric NOT NULL DEFAULT 0,
  quantity_value numeric,
  quantity_unit text,
  category text NOT NULL DEFAULT 'General',
  date timestamptz,
  payment_method text,
  is_paid boolean NOT NULL DEFAULT false,
  paid_date timestamptz,
  is_cancellable text NOT NULL DEFAULT 'no',
  cancellation_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_expenses_event ON event_expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_event_expenses_household ON event_expenses(household_id);
ALTER TABLE event_expenses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  provider text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'other',
  key_detail text,
  notes text,
  external_link text,
  physical_location text,
  important_date timestamptz,
  important_date_label text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_household ON documents(household_id);
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON documents(deleted_at);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- document_person_tags — wayfinding only, never access
CREATE TABLE IF NOT EXISTS document_person_tags (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES trusted_person(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, person_id)
);
ALTER TABLE document_person_tags ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FINANCIAL TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  provider text NOT NULL,
  policy_number text,
  type text NOT NULL DEFAULT 'other',
  premium numeric,
  premium_frequency text,
  renewal_date timestamptz,
  document_link text,
  notes text,
  linked_bill_id uuid REFERENCES bills(id) ON DELETE SET NULL,
  contact_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_insurance_household ON financial_insurance(household_id);
ALTER TABLE financial_insurance ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS financial_superannuation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  fund_name text NOT NULL,
  account_number text,
  estimated_balance numeric NOT NULL DEFAULT 0,
  notes text,
  contact_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_super_household ON financial_superannuation(household_id);
ALTER TABLE financial_superannuation ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS financial_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  approximate_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_income_household ON financial_income(household_id);
ALTER TABLE financial_income ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS financial_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  owed_to text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  approximate_balance numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_debts_household ON financial_debts(household_id);
ALTER TABLE financial_debts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS financial_misc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_misc_household ON financial_misc(household_id);
ALTER TABLE financial_misc ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TAX DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  year int NOT NULL,
  amount numeric,
  notes text,
  is_tax_relevant boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tax_documents_household ON tax_documents(household_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_deleted ON tax_documents(deleted_at);
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DOCUMENT LINKS + TAX TAGS (append-only history)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'document',
  link_type text NOT NULL,
  target_id uuid NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_document_links_household ON document_links(household_id);
CREATE INDEX IF NOT EXISTS idx_document_links_document ON document_links(document_id);
ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tax_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL,
  tax_year int NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  tax_type text,
  business_name text,
  origin text NOT NULL DEFAULT 'direct',
  carried_from_year int,
  tagged_at timestamptz NOT NULL DEFAULT now(),
  untagged_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_tax_tags_household ON tax_tags(household_id);
CREATE INDEX IF NOT EXISTS idx_tax_tags_item ON tax_tags(item_id);
ALTER TABLE tax_tags ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — DOMAIN TABLES
-- ============================================================
-- Pattern for every domain table:
--   SELECT: household member OR shared viewer with can_access() for that scope
--   INSERT/UPDATE/DELETE: household member only (shared viewers are read-only)

-- ---- payment_cards ----
DROP POLICY IF EXISTS "read_payment_cards" ON payment_cards;
CREATE POLICY "read_payment_cards"
  ON payment_cards FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "insert_payment_cards" ON payment_cards;
CREATE POLICY "insert_payment_cards"
  ON payment_cards FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_payment_cards" ON payment_cards;
CREATE POLICY "update_payment_cards"
  ON payment_cards FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_payment_cards" ON payment_cards;
CREATE POLICY "delete_payment_cards"
  ON payment_cards FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- bills ----
DROP POLICY IF EXISTS "read_bills" ON bills;
CREATE POLICY "read_bills"
  ON bills FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'bills', bills.id)
    )
  );

DROP POLICY IF EXISTS "insert_bills" ON bills;
CREATE POLICY "insert_bills"
  ON bills FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_bills" ON bills;
CREATE POLICY "update_bills"
  ON bills FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_bills" ON bills;
CREATE POLICY "delete_bills"
  ON bills FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- bill_person_tags (wayfinding only) ----
DROP POLICY IF EXISTS "read_bill_person_tags" ON bill_person_tags;
CREATE POLICY "read_bill_person_tags"
  ON bill_person_tags FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_person_tags.bill_id
      AND is_household_member(auth.uid(), bills.household_id))
  );

DROP POLICY IF EXISTS "insert_bill_person_tags" ON bill_person_tags;
CREATE POLICY "insert_bill_person_tags"
  ON bill_person_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_person_tags.bill_id
      AND is_household_member(auth.uid(), bills.household_id))
  );

DROP POLICY IF EXISTS "delete_bill_person_tags" ON bill_person_tags;
CREATE POLICY "delete_bill_person_tags"
  ON bill_person_tags FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_person_tags.bill_id
      AND is_household_member(auth.uid(), bills.household_id))
  );

-- ---- events ----
DROP POLICY IF EXISTS "read_events" ON events;
CREATE POLICY "read_events"
  ON events FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'events', events.id)
    )
  );

DROP POLICY IF EXISTS "insert_events" ON events;
CREATE POLICY "insert_events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_events" ON events;
CREATE POLICY "update_events"
  ON events FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_events" ON events;
CREATE POLICY "delete_events"
  ON events FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- event_expenses ----
DROP POLICY IF EXISTS "read_event_expenses" ON event_expenses;
CREATE POLICY "read_event_expenses"
  ON event_expenses FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'events', event_expenses.event_id)
    )
  );

DROP POLICY IF EXISTS "insert_event_expenses" ON event_expenses;
CREATE POLICY "insert_event_expenses"
  ON event_expenses FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_event_expenses" ON event_expenses;
CREATE POLICY "update_event_expenses"
  ON event_expenses FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_event_expenses" ON event_expenses;
CREATE POLICY "delete_event_expenses"
  ON event_expenses FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- documents ----
DROP POLICY IF EXISTS "read_documents" ON documents;
CREATE POLICY "read_documents"
  ON documents FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'documents', documents.id)
    )
  );

DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents"
  ON documents FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents"
  ON documents FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- document_person_tags (wayfinding only) ----
DROP POLICY IF EXISTS "read_document_person_tags" ON document_person_tags;
CREATE POLICY "read_document_person_tags"
  ON document_person_tags FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_person_tags.document_id
      AND is_household_member(auth.uid(), documents.household_id))
  );

DROP POLICY IF EXISTS "insert_document_person_tags" ON document_person_tags;
CREATE POLICY "insert_document_person_tags"
  ON document_person_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_person_tags.document_id
      AND is_household_member(auth.uid(), documents.household_id))
  );

DROP POLICY IF EXISTS "delete_document_person_tags" ON document_person_tags;
CREATE POLICY "delete_document_person_tags"
  ON document_person_tags FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_person_tags.document_id
      AND is_household_member(auth.uid(), documents.household_id))
  );

-- ---- financial_insurance ----
DROP POLICY IF EXISTS "read_financial_insurance" ON financial_insurance;
CREATE POLICY "read_financial_insurance"
  ON financial_insurance FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_insurance.id)
    )
  );

DROP POLICY IF EXISTS "insert_financial_insurance" ON financial_insurance;
CREATE POLICY "insert_financial_insurance"
  ON financial_insurance FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_insurance" ON financial_insurance;
CREATE POLICY "update_financial_insurance"
  ON financial_insurance FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_insurance" ON financial_insurance;
CREATE POLICY "delete_financial_insurance"
  ON financial_insurance FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- financial_superannuation ----
DROP POLICY IF EXISTS "read_financial_superannuation" ON financial_superannuation;
CREATE POLICY "read_financial_superannuation"
  ON financial_superannuation FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_superannuation.id)
    )
  );

DROP POLICY IF EXISTS "insert_financial_superannuation" ON financial_superannuation;
CREATE POLICY "insert_financial_superannuation"
  ON financial_superannuation FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_superannuation" ON financial_superannuation;
CREATE POLICY "update_financial_superannuation"
  ON financial_superannuation FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_superannuation" ON financial_superannuation;
CREATE POLICY "delete_financial_superannuation"
  ON financial_superannuation FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- financial_income ----
DROP POLICY IF EXISTS "read_financial_income" ON financial_income;
CREATE POLICY "read_financial_income"
  ON financial_income FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_income.id)
    )
  );

DROP POLICY IF EXISTS "insert_financial_income" ON financial_income;
CREATE POLICY "insert_financial_income"
  ON financial_income FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_income" ON financial_income;
CREATE POLICY "update_financial_income"
  ON financial_income FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_income" ON financial_income;
CREATE POLICY "delete_financial_income"
  ON financial_income FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- financial_debts ----
DROP POLICY IF EXISTS "read_financial_debts" ON financial_debts;
CREATE POLICY "read_financial_debts"
  ON financial_debts FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_debts.id)
    )
  );

DROP POLICY IF EXISTS "insert_financial_debts" ON financial_debts;
CREATE POLICY "insert_financial_debts"
  ON financial_debts FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_debts" ON financial_debts;
CREATE POLICY "update_financial_debts"
  ON financial_debts FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_debts" ON financial_debts;
CREATE POLICY "delete_financial_debts"
  ON financial_debts FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- financial_misc ----
DROP POLICY IF EXISTS "read_financial_misc" ON financial_misc;
CREATE POLICY "read_financial_misc"
  ON financial_misc FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'financial_info', financial_misc.id)
    )
  );

DROP POLICY IF EXISTS "insert_financial_misc" ON financial_misc;
CREATE POLICY "insert_financial_misc"
  ON financial_misc FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_financial_misc" ON financial_misc;
CREATE POLICY "update_financial_misc"
  ON financial_misc FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_financial_misc" ON financial_misc;
CREATE POLICY "delete_financial_misc"
  ON financial_misc FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- tax_documents ----
DROP POLICY IF EXISTS "read_tax_documents" ON tax_documents;
CREATE POLICY "read_tax_documents"
  ON tax_documents FOR SELECT TO authenticated
  USING (
    is_household_member(auth.uid(), household_id)
    OR EXISTS (
      SELECT 1 FROM trusted_person tp
      WHERE tp.user_id = auth.uid() AND tp.status = 'active'
        AND can_access(tp.id, 'tax_documents', tax_documents.id)
    )
  );

DROP POLICY IF EXISTS "insert_tax_documents" ON tax_documents;
CREATE POLICY "insert_tax_documents"
  ON tax_documents FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_tax_documents" ON tax_documents;
CREATE POLICY "update_tax_documents"
  ON tax_documents FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_tax_documents" ON tax_documents;
CREATE POLICY "delete_tax_documents"
  ON tax_documents FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- document_links ----
DROP POLICY IF EXISTS "read_document_links" ON document_links;
CREATE POLICY "read_document_links"
  ON document_links FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "insert_document_links" ON document_links;
CREATE POLICY "insert_document_links"
  ON document_links FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_document_links" ON document_links;
CREATE POLICY "update_document_links"
  ON document_links FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_document_links" ON document_links;
CREATE POLICY "delete_document_links"
  ON document_links FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ---- tax_tags ----
DROP POLICY IF EXISTS "read_tax_tags" ON tax_tags;
CREATE POLICY "read_tax_tags"
  ON tax_tags FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "insert_tax_tags" ON tax_tags;
CREATE POLICY "insert_tax_tags"
  ON tax_tags FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_tax_tags" ON tax_tags;
CREATE POLICY "update_tax_tags"
  ON tax_tags FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_tax_tags" ON tax_tags;
CREATE POLICY "delete_tax_tags"
  ON tax_tags FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- ============================================================
-- REAL SAMPLE DATA SEEDER (replaces the stub)
-- ============================================================
CREATE OR REPLACE FUNCTION seed_sample_data(p_household_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_seeded timestamptz;
  v_today date := now()::date;
  v_event_1 uuid;
  v_event_2 uuid;
BEGIN
  -- Idempotent: do nothing if already seeded
  SELECT sample_data_seeded_at INTO v_already_seeded
  FROM households WHERE id = p_household_id;
  IF v_already_seeded IS NOT NULL THEN
    RETURN;
  END IF;

  -- ---- Sample bills (same 3 as the spec: Electric, Internet, Phone) ----
  INSERT INTO bills (household_id, name, amount, due_date, is_recurring, recurring_interval, payment_method, category, status, is_sample)
  VALUES
    (p_household_id, 'Electric Bill', 142.50,
     (v_today + 5)::timestamptz, true, 'monthly', 'direct_debit', 'utilities', 'due_soon', true),
    (p_household_id, 'Internet Service', 79.99,
     (v_today + 12)::timestamptz, true, 'monthly', 'credit_card', 'services', 'pending', true),
    (p_household_id, 'Phone Plan', 45.00,
     (v_today - 2)::timestamptz, true, 'monthly', 'credit_card', 'services', 'overdue', true);

  -- ---- Sample events ----
  INSERT INTO events (id, household_id, name, type, budget, start_date, end_date, status, is_sample)
  VALUES (gen_random_uuid(), p_household_id, 'Sample Family Trip to Hawaii', 'travel', 5000,
    (v_today + 14)::timestamptz, (v_today + 21)::timestamptz, 'active', true)
  RETURNING id INTO v_event_1;

  INSERT INTO event_expenses (event_id, household_id, name, amount, category, is_paid, paid_date)
  VALUES
    (v_event_1, p_household_id, 'Round-trip flights', 1200, 'Flights', true, now()),
    (v_event_1, p_household_id, 'Beach Resort (7 nights)', 1800, 'Accommodation', true, now()),
    (v_event_1, p_household_id, 'Rental car', 350, 'Transportation', false, null),
    (v_event_1, p_household_id, 'Snorkeling tour', 200, 'Activities', false, null),
    (v_event_1, p_household_id, 'Luau dinner', 150, 'Food & Dining', false, null);

  INSERT INTO events (id, household_id, name, type, budget, start_date, end_date, status, is_sample)
  VALUES (gen_random_uuid(), p_household_id, 'Sample Birthday Party', 'birthday', 500,
    (v_today - interval '3 months')::timestamptz, (v_today - interval '3 months')::timestamptz, 'completed', true)
  RETURNING id INTO v_event_2;

  INSERT INTO event_expenses (event_id, household_id, name, amount, category, is_paid, paid_date)
  VALUES
    (v_event_2, p_household_id, 'Party venue rental', 150, 'Venue', true, (v_today - interval '3 months')::timestamptz),
    (v_event_2, p_household_id, 'Cake', 75, 'Cake', true, (v_today - interval '3 months')::timestamptz),
    (v_event_2, p_household_id, 'Decorations', 50, 'Decorations', true, (v_today - interval '3 months')::timestamptz);

  -- Mark as seeded
  UPDATE households SET sample_data_seeded_at = now() WHERE id = p_household_id;
END;
$$;