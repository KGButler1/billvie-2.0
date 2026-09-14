-- Database-level enforcement: advisor/accountant grants are permanently view-only.
-- The edge function already forces can_edit=false, and the UI hides the toggle,
-- but this CHECK constraint makes it structurally impossible for an advisor or
-- accountant row to have can_edit=true — surviving any future code path that
-- forgets the check.

ALTER TABLE trusted_person
  DROP CONSTRAINT IF EXISTS advisor_accountant_view_only;

ALTER TABLE trusted_person
  ADD CONSTRAINT advisor_accountant_view_only
  CHECK (
    can_edit = false
    OR role NOT IN ('advisor', 'accountant')
  );
