-- Trigger: prevent setting can_edit=true on advisor/accountant rows via UPDATE.
-- The CHECK constraint catches INSERT, but UPDATE could theoretically set
-- can_edit=true on an existing advisor row before the constraint re-checks.
-- This trigger blocks that path explicitly.

CREATE OR REPLACE FUNCTION prevent_advisor_can_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('advisor', 'accountant') AND NEW.can_edit = true THEN
    RAISE EXCEPTION 'Advisors and accountants are permanently view-only — can_edit cannot be true.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_advisor_can_edit ON trusted_person;

CREATE TRIGGER trg_prevent_advisor_can_edit
  BEFORE INSERT OR UPDATE OF can_edit, role ON trusted_person
  FOR EACH ROW
  EXECUTE FUNCTION prevent_advisor_can_edit();
