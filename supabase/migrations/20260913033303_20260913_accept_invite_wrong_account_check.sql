/*
# Add wrong-account guard to accept_household_invite

## Purpose
When someone clicks an invite link but is signed in with a different email
than the one the invite was sent to, the RPC currently activates the invite
under whatever account is active — silently giving the wrong person access.

## Changes
- Replaces the `accept_household_invite` SECURITY DEFINER function with a
  version that looks up the signed-in user's email from `auth.users` and
  compares it case-insensitively to the invited row's email.
- If they don't match, raises a `WRONG_ACCOUNT:` prefixed exception so the
  frontend can show a specific, friendly message.
- No schema changes, no new tables, no RLS policy changes.

## Security
- The function remains SECURITY DEFINER with `search_path = public`.
- The new email lookup reads from `auth.users` (only the caller's own row
  via `auth.uid()`), which is safe inside a SECURITY DEFINER context.
- No new grants or policy changes.
*/

CREATE OR REPLACE FUNCTION accept_household_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person trusted_person%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_household_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to accept an invite';
  END IF;

  SELECT * INTO v_person
  FROM trusted_person
  WHERE invite_token = p_token
    AND status = 'invited'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invite link isn''t valid — ask them to send it again';
  END IF;

  -- Look up the signed-in user's email and compare to the invited email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF v_user_email IS NULL OR lower(trim(v_user_email)) <> lower(trim(v_person.email)) THEN
    RAISE EXCEPTION 'WRONG_ACCOUNT: This invite was sent to %, but you are signed in as %.', v_person.email, COALESCE(v_user_email, '(unknown)');
  END IF;

  UPDATE trusted_person
  SET user_id = v_user_id,
      status = 'active',
      activated_at = now(),
      updated_at = now()
  WHERE id = v_person.id;

  v_household_id := v_person.household_id;

  RETURN v_household_id;
END;
$$;
