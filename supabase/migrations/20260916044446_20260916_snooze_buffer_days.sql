ALTER TABLE households
  ADD COLUMN IF NOT EXISTS snooze_buffer_days integer NOT NULL DEFAULT 3
  CHECK (snooze_buffer_days IN (1, 3, 5, 7));

CREATE OR REPLACE FUNCTION update_snooze_buffer_days(p_household_id uuid, p_days integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_days NOT IN (1, 3, 5, 7) THEN
    RAISE EXCEPTION 'invalid buffer value';
  END IF;
  IF NOT is_household_admin(auth.uid(), p_household_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE households
    SET snooze_buffer_days = p_days
    WHERE id = p_household_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_snooze_buffer_days(uuid, integer) TO authenticated;
