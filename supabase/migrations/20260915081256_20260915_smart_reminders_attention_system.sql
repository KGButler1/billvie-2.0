/*
# Smart Reminders — Household "Needs attention" system

1. Schema changes
   - documents: add `expires_on date null` (optional expiry/renewal date)
   - households: add `reminders_digest_frequency text` default 'weekly'
     and `reminders_last_digest_at timestamptz null`
   - New table `attention_dismissals`

2. get_household_attention_items(p_household_id uuid)
   SECURITY DEFINER, read-only, returns computed attention items.
   Checks caller is a household member (or service role) before returning.
   Excludes items with an active snooze or permanent dismissal.

3. update_reminders_digest_frequency(p_household_id uuid, p_frequency text)
   SECURITY DEFINER, admin-only, updates digest frequency on households.

4. RLS on attention_dismissals: admin read/write, member read.
*/

-- ============================================================
-- 1a. documents.expires_on
-- ============================================================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_on date;

-- ============================================================
-- 1b. households digest columns
-- ============================================================
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS reminders_digest_frequency text NOT NULL DEFAULT 'weekly'
    CHECK (reminders_digest_frequency IN ('off', 'weekly', 'monthly'));
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS reminders_last_digest_at timestamptz;

-- ============================================================
-- 1c. attention_dismissals table
-- ============================================================
CREATE TABLE IF NOT EXISTS attention_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  entity_id uuid,
  snoozed_until timestamptz,
  dismissed_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attention_dismissals_unique UNIQUE (household_id, rule_key, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_attention_dismissals_household
  ON attention_dismissals(household_id);

ALTER TABLE attention_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_attention_dismissals" ON attention_dismissals;
CREATE POLICY "admin_read_attention_dismissals"
  ON attention_dismissals FOR SELECT TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "admin_insert_attention_dismissals" ON attention_dismissals;
CREATE POLICY "admin_insert_attention_dismissals"
  ON attention_dismissals FOR INSERT TO authenticated
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "admin_update_attention_dismissals" ON attention_dismissals;
CREATE POLICY "admin_update_attention_dismissals"
  ON attention_dismissals FOR UPDATE TO authenticated
  USING (is_household_admin(auth.uid(), household_id))
  WITH CHECK (is_household_admin(auth.uid(), household_id));

DROP POLICY IF EXISTS "admin_delete_attention_dismissals" ON attention_dismissals;
CREATE POLICY "admin_delete_attention_dismissals"
  ON attention_dismissals FOR DELETE TO authenticated
  USING (is_household_admin(auth.uid(), household_id));

-- ============================================================
-- 2. get_household_attention_items — the single rules function
-- ============================================================
CREATE OR REPLACE FUNCTION get_household_attention_items(p_household_id uuid)
RETURNS TABLE (
  rule_key text,
  category text,
  severity text,
  entity_type text,
  entity_id uuid,
  title text,
  detail text,
  action_path text,
  due_at date,
  paid_only boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_days integer;
  v_today date := now()::date;
  v_has_bills boolean;
  v_has_docs boolean;
  v_has_trusted_persons boolean;
  v_has_key_contacts boolean;
  v_is_member boolean;
BEGIN
  -- Access check: caller must be a household member.
  -- Service role (used by n8n) bypasses this via the service_role bypass.
  v_is_member := is_household_member(auth.uid(), p_household_id);
  IF v_is_member IS NOT TRUE AND auth.uid() IS NOT NULL THEN
    RETURN;
  END IF;

  -- Get the household's Coming Up window
  SELECT bills_coming_up_window_days INTO v_window_days
  FROM households WHERE id = p_household_id;
  IF v_window_days IS NULL THEN v_window_days := 14; END IF;

  -- Precompute existence flags
  SELECT EXISTS(SELECT 1 FROM bills WHERE household_id = p_household_id AND deleted_at IS NULL)
    INTO v_has_bills;
  SELECT EXISTS(SELECT 1 FROM documents WHERE household_id = p_household_id AND deleted_at IS NULL AND COALESCE(scan_sourced, false) = false AND COALESCE(source, 'manual') <> 'bill_link')
    INTO v_has_docs;
  SELECT EXISTS(
    SELECT 1 FROM trusted_person tp
    WHERE tp.household_id = p_household_id
      AND tp.status = 'active'
      AND tp.access_level IN ('owner', 'co_owner', 'trusted_person')
  ) INTO v_has_trusted_persons;
  SELECT EXISTS(SELECT 1 FROM key_people WHERE household_id = p_household_id) INTO v_has_key_contacts;

  -- ============================================================
  -- DUE RULES (free)
  -- ============================================================

  -- BILL_DUE: overdue → critical, due within window → warning
  -- Exclude snoozed/dismissed items
  RETURN QUERY
  SELECT
    'BILL_DUE'::text,
    'due'::text,
    CASE WHEN b.due_date < now() THEN 'critical' ELSE 'warning' END,
    'bill'::text,
    b.id,
    CASE
      WHEN b.due_date < now() THEN b.name || ' is overdue'
      ELSE b.name || ' is due ' || to_char(b.due_date, 'DD Mon')
    END,
    CASE
      WHEN b.amount IS NOT NULL THEN to_char(b.amount, '$FM999,990.00')
      ELSE NULL
    END,
    '/bills'::text,
    (b.due_date)::date,
    false
  FROM bills b
  WHERE b.household_id = p_household_id
    AND b.deleted_at IS NULL
    AND b.status IN ('pending', 'overdue', 'due_soon')
    AND NOT EXISTS (
      SELECT 1 FROM attention_dismissals ad
      WHERE ad.household_id = p_household_id
        AND ad.rule_key = 'BILL_DUE'
        AND ad.entity_id = b.id
        AND (ad.dismissed_at IS NOT NULL OR (ad.snoozed_until IS NOT NULL AND ad.snoozed_until > now()))
    );

  -- EVENT_UPCOMING: event within 14 days → info
  RETURN QUERY
  SELECT
    'EVENT_UPCOMING'::text,
    'due'::text,
    'info'::text,
    'event'::text,
    e.id,
    e.name || ' is coming up ' || to_char(e.start_date, 'DD Mon'),
    CASE WHEN e.end_date IS NOT NULL THEN to_char(e.start_date, 'DD Mon') || '–' || to_char(e.end_date, 'DD Mon') ELSE NULL END,
    '/events'::text,
    (e.start_date)::date,
    false
  FROM events e
  WHERE e.household_id = p_household_id
    AND e.deleted_at IS NULL
    AND e.start_date IS NOT NULL
    AND e.start_date >= now()
    AND e.start_date <= (now() + interval '14 days')
    AND NOT EXISTS (
      SELECT 1 FROM attention_dismissals ad
      WHERE ad.household_id = p_household_id
        AND ad.rule_key = 'EVENT_UPCOMING'
        AND ad.entity_id = e.id
        AND (ad.dismissed_at IS NOT NULL OR (ad.snoozed_until IS NOT NULL AND ad.snoozed_until > now()))
    );

  -- ============================================================
  -- DUE RULES (paid_only)
  -- ============================================================

  -- CARD_EXPIRING: expiring within 60 days → warning; expired → critical
  RETURN QUERY
  SELECT
    'CARD_EXPIRING'::text,
    'due'::text,
    CASE WHEN (pc.expiry_year < extract('year' from now())::int)
               OR (pc.expiry_year = extract('year' from now())::int AND pc.expiry_month < extract('month' from now())::int)
         THEN 'critical' ELSE 'warning' END,
    'card'::text,
    pc.id,
    CASE
      WHEN (pc.expiry_year < extract('year' from now())::int)
           OR (pc.expiry_year = extract('year' from now())::int AND pc.expiry_month < extract('month' from now())::int)
        THEN pc.nickname || ' has expired'
      ELSE pc.nickname || ' expires ' || to_char(make_date(pc.expiry_year, pc.expiry_month, 1), 'MM/YY')
    END,
    (
      SELECT string_agg(b.name, ', ')
      FROM bills b
      WHERE b.payment_card_id = pc.id
        AND b.deleted_at IS NULL
        AND b.status IN ('pending', 'overdue', 'due_soon')
    ),
    '/settings'::text,
    make_date(pc.expiry_year, pc.expiry_month, 1),
    true
  FROM payment_cards pc
  WHERE pc.household_id = p_household_id
    AND pc.archived_at IS NULL
    AND pc.expiry_month IS NOT NULL
    AND pc.expiry_year IS NOT NULL
    AND (
      make_date(pc.expiry_year, pc.expiry_month, 1) <= (v_today + 60)
    )
    AND NOT EXISTS (
      SELECT 1 FROM attention_dismissals ad
      WHERE ad.household_id = p_household_id
        AND ad.rule_key = 'CARD_EXPIRING'
        AND ad.entity_id = pc.id
        AND (ad.dismissed_at IS NOT NULL OR (ad.snoozed_until IS NOT NULL AND ad.snoozed_until > now()))
    );

  -- DOCUMENT_EXPIRING: expires_on within 60 days → warning; past → critical
  RETURN QUERY
  SELECT
    'DOCUMENT_EXPIRING'::text,
    'due'::text,
    CASE WHEN d.expires_on < v_today THEN 'critical' ELSE 'warning' END,
    'document'::text,
    d.id,
    d.title || CASE WHEN d.expires_on < v_today THEN ' expired ' ELSE ' expires ' END || to_char(d.expires_on, 'DD Mon YYYY'),
    d.important_date_label,
    '/documents'::text,
    d.expires_on,
    true
  FROM documents d
  WHERE d.household_id = p_household_id
    AND d.deleted_at IS NULL
    AND d.expires_on IS NOT NULL
    AND d.expires_on <= (v_today + 60)
    AND COALESCE(d.scan_sourced, false) = false
    AND COALESCE(d.source, 'manual') <> 'bill_link'
    AND NOT EXISTS (
      SELECT 1 FROM attention_dismissals ad
      WHERE ad.household_id = p_household_id
        AND ad.rule_key = 'DOCUMENT_EXPIRING'
        AND ad.entity_id = d.id
        AND (ad.dismissed_at IS NOT NULL OR (ad.snoozed_until IS NOT NULL AND ad.snoozed_until > now()))
    );

  -- ============================================================
  -- STALE RULES (paid_only)
  -- ============================================================

  -- SNAPSHOT_STALE: financial section not updated in 6 months → info (one per section)
  -- insurance
  IF EXISTS(
    SELECT 1 FROM financial_insurance
    WHERE household_id = p_household_id AND deleted_at IS NULL
      AND updated_at < (now() - interval '6 months')
  ) AND NOT EXISTS(
    SELECT 1 FROM attention_dismissals ad
    WHERE ad.household_id = p_household_id AND ad.rule_key = 'SNAPSHOT_STALE'
      AND ad.entity_id IS NULL
      AND (ad.dismissed_at IS NOT NULL OR (ad.snoozed_until IS NOT NULL AND ad.snoozed_until > now()))
  ) THEN
    RETURN QUERY SELECT 'SNAPSHOT_STALE'::text, 'stale'::text, 'info'::text,
      'financial_insurance'::text, NULL::uuid,
      'Insurance hasn''t been reviewed recently'::text,
      'Last updated over 6 months ago'::text,
      '/financial'::text, NULL::date, true;
  END IF;

  -- superannuation
  IF EXISTS(
    SELECT 1 FROM financial_superannuation
    WHERE household_id = p_household_id AND deleted_at IS NULL
      AND updated_at < (now() - interval '6 months')
  ) AND NOT EXISTS(
    SELECT 1 FROM attention_dismissals ad
    WHERE ad.household_id = p_household_id AND ad.rule_key = 'SNAPSHOT_STALE'
      AND ad.entity_id = (SELECT id FROM financial_superannuation WHERE household_id = p_household_id AND deleted_at IS NULL ORDER BY updated_at ASC LIMIT 1)
      AND (ad.dismissed_at IS NOT NULL OR (ad.snoozed_until IS NOT NULL AND ad.snoozed_until > now()))
  ) THEN
    RETURN QUERY SELECT 'SNAPSHOT_STALE'::text, 'stale'::text, 'info'::text,
      'financial_superannuation'::text, NULL::uuid,
      'Super & savings haven''t been reviewed recently'::text,
      'Last updated over 6 months ago'::text,
      '/financial'::text, NULL::date, true;
  END IF;

  -- income
  IF EXISTS(
    SELECT 1 FROM financial_income
    WHERE household_id = p_household_id AND deleted_at IS NULL
      AND updated_at < (now() - interval '6 months')
  ) AND NOT EXISTS(
    SELECT 1 FROM attention_dismissals ad
    WHERE ad.household_id = p_household_id AND ad.rule_key = 'SNAPSHOT_STALE'
      AND ad.entity_id IS NULL
      AND (ad.dismissed_at IS NOT NULL OR (ad.snoozed_until IS NOT NULL AND ad.snoozed_until > now()))
  ) THEN
    RETURN QUERY SELECT 'SNAPSHOT_STALE'::text, 'stale'::text, 'info'::text,
      'financial_income'::text, NULL::uuid,
      'Income hasn''t been reviewed recently'::text,
      'Last updated over 6 months ago'::text,
      '/financial'::text, NULL::date, true;
  END IF;

  -- debts
  IF EXISTS(
    SELECT 1 FROM financial_debts
    WHERE household_id = p_household_id AND deleted_at IS NULL
      AND updated_at < (now() - interval '6 months')
  ) AND NOT EXISTS(
    SELECT 1 FROM attention_dismissals ad
    WHERE ad.household_id = p_household_id AND ad.rule_key = 'SNAPSHOT_STALE'
      AND ad.entity_id IS NULL
      AND (ad.dismissed_at IS NOT NULL OR (ad.snoozed_until IS NOT NULL AND ad.snoozed_until > now()))
  ) THEN
    RETURN QUERY SELECT 'SNAPSHOT_STALE'::text, 'stale'::text, 'info'::text,
      'financial_debts'::text, NULL::uuid,
      'Debts haven''t been reviewed recently'::text,
      'Last updated over 6 months ago'::text,
      '/financial'::text, NULL::date, true;
  END IF;

  -- INSURANCE_STALE: insurance not updated in 12 months → warning
  IF EXISTS(
    SELECT 1 FROM financial_insurance
    WHERE household_id = p_household_id AND deleted_at IS NULL
      AND updated_at < (now() - interval '12 months')
  ) AND NOT EXISTS(
    SELECT 1 FROM attention_dismissals ad
    WHERE ad.household_id = p_household_id AND ad.rule_key = 'INSURANCE_STALE'
      AND ad.entity_id IS NULL
      AND (ad.dismissed_at IS NOT NULL OR (ad.snoozed_until IS NOT NULL AND ad.snoozed_until > now()))
  ) THEN
    RETURN QUERY SELECT 'INSURANCE_STALE'::text, 'stale'::text, 'warning'::text,
      'financial_insurance'::text, NULL::uuid,
      'Insurance hasn''t been reviewed in over a year'::text,
      'Review your policies to make sure they''re still right for you'::text,
      '/financial'::text, NULL::date, true;
  END IF;

  -- ============================================================
  -- GAP RULES (free)
  -- ============================================================

  -- NO_TRUSTED_PERSON: has bills or docs but zero active trusted people → warning
  IF (v_has_bills OR v_has_docs) AND NOT v_has_trusted_persons
     AND NOT EXISTS(
       SELECT 1 FROM attention_dismissals ad
       WHERE ad.household_id = p_household_id AND ad.rule_key = 'NO_TRUSTED_PERSON'
         AND ad.entity_id IS NULL
         AND ad.dismissed_at IS NOT NULL
     ) THEN
    RETURN QUERY SELECT 'NO_TRUSTED_PERSON'::text, 'gap'::text, 'warning'::text,
      NULL::text, NULL::uuid,
      'No one else can see your household'::text,
      'Add a trusted person so someone can step in if needed'::text,
      '/people'::text, NULL::date, false;
  END IF;

  -- INVITE_PENDING: trusted person invited > 14 days ago, not accepted → info
  RETURN QUERY
  SELECT
    'INVITE_PENDING'::text,
    'gap'::text,
    'info'::text,
    'trusted_person'::text,
    tp.id,
    tp.name || ' hasn''t accepted the invite yet'::text,
    'Invited ' || to_char(tp.invited_at, 'DD Mon YYYY')::text,
    '/people'::text,
    NULL::date,
    false
  FROM trusted_person tp
  WHERE tp.household_id = p_household_id
    AND tp.status = 'invited'
    AND tp.invited_at IS NOT NULL
    AND tp.invited_at < (now() - interval '14 days')
    AND NOT EXISTS (
      SELECT 1 FROM attention_dismissals ad
      WHERE ad.household_id = p_household_id
        AND ad.rule_key = 'INVITE_PENDING'
        AND ad.entity_id = tp.id
        AND ad.dismissed_at IS NOT NULL
    );

  -- DOCUMENTS_UNSHARED: documents exist but no trusted person holds Documents scope → warning
  IF v_has_docs AND NOT EXISTS(
    SELECT 1 FROM access_grants ag
    JOIN trusted_person tp ON tp.id = ag.person_id
    WHERE ag.household_id = p_household_id
      AND ag.scope = 'documents'
      AND ag.revoked_at IS NULL
      AND tp.status = 'active'
  ) AND NOT EXISTS(
    SELECT 1 FROM attention_dismissals ad
    WHERE ad.household_id = p_household_id AND ad.rule_key = 'DOCUMENTS_UNSHARED'
      AND ad.entity_id IS NULL AND ad.dismissed_at IS NOT NULL
  ) THEN
    RETURN QUERY SELECT 'DOCUMENTS_UNSHARED'::text, 'gap'::text, 'warning'::text,
      NULL::text, NULL::uuid,
      'Documents aren''t shared with anyone'::text,
      'A trusted person can''t see your important documents yet'::text,
      '/people'::text, NULL::date, false;
  END IF;

  -- BILLS_UNSHARED: bills exist but no trusted person holds Bills scope → info
  IF v_has_bills AND NOT EXISTS(
    SELECT 1 FROM access_grants ag
    JOIN trusted_person tp ON tp.id = ag.person_id
    WHERE ag.household_id = p_household_id
      AND ag.scope = 'bills'
      AND ag.revoked_at IS NULL
      AND tp.status = 'active'
  ) AND NOT EXISTS(
    SELECT 1 FROM attention_dismissals ad
    WHERE ad.household_id = p_household_id AND ad.rule_key = 'BILLS_UNSHARED'
      AND ad.entity_id IS NULL AND ad.dismissed_at IS NOT NULL
  ) THEN
    RETURN QUERY SELECT 'BILLS_UNSHARED'::text, 'gap'::text, 'info'::text,
      NULL::text, NULL::uuid,
      'Bills aren''t shared with anyone'::text,
      'A trusted person can''t see your bills yet'::text,
      '/people'::text, NULL::date, false;
  END IF;

  -- NO_KEY_CONTACTS: zero key contacts → info
  IF NOT v_has_key_contacts
     AND NOT EXISTS(
       SELECT 1 FROM attention_dismissals ad
       WHERE ad.household_id = p_household_id AND ad.rule_key = 'NO_KEY_CONTACTS'
         AND ad.entity_id IS NULL AND ad.dismissed_at IS NOT NULL
     ) THEN
    RETURN QUERY SELECT 'NO_KEY_CONTACTS'::text, 'gap'::text, 'info'::text,
      NULL::text, NULL::uuid,
      'No key contacts added'::text,
      'Add a lawyer, doctor, or executor so someone knows who to call'::text,
      '/key-people'::text, NULL::date, false;
  END IF;
END;
$$;

-- ============================================================
-- 3. update_reminders_digest_frequency
-- ============================================================
CREATE OR REPLACE FUNCTION update_reminders_digest_frequency(
  p_household_id uuid,
  p_frequency text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_frequency NOT IN ('off', 'weekly', 'monthly') THEN
    RAISE EXCEPTION 'Invalid frequency';
  END IF;
  IF NOT is_household_admin(auth.uid(), p_household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE households
  SET reminders_digest_frequency = p_frequency
  WHERE id = p_household_id;
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION get_household_attention_items(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_reminders_digest_frequency(uuid, text) TO authenticated;
