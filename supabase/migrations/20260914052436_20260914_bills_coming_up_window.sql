/*
# Household-level "Coming Up" window setting

## Background
"Coming Up" currently has no upper bound — every non-overdue, non-paid bill
shows up regardless of how far out the due date is. This migration adds a
household-level setting so the household can choose 7/14/21/30 days.

## Changes

### 1. Column on households
Adds `bills_coming_up_window_days` (integer, NOT NULL, default 14) with a
CHECK constraint limiting values to 7, 14, 21, or 30.

### 2. SECURITY DEFINER RPC
`update_bills_coming_up_window(p_household_id uuid, p_days integer)`
Updates the column. Validates the days value and checks
`is_household_admin(auth.uid(), p_household_id)` before updating.
Follows the existing pattern used by `create_household_with_owner` —
no direct client UPDATE policy on `households`.

### Constraints
- No new table. No data migration. No data loss.
- `is_household_admin()` already exists — not redefined.
*/

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS bills_coming_up_window_days integer NOT NULL DEFAULT 14
  CHECK (bills_coming_up_window_days IN (7, 14, 21, 30));

CREATE OR REPLACE FUNCTION update_bills_coming_up_window(p_household_id uuid, p_days integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_days NOT IN (7, 14, 21, 30) THEN
    RAISE EXCEPTION 'invalid window value';
  END IF;
  IF NOT is_household_admin(auth.uid(), p_household_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE households
    SET bills_coming_up_window_days = p_days
    WHERE id = p_household_id;
END;
$$;