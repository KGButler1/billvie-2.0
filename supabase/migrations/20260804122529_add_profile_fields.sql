-- Add display_name and avatar_url to trusted_person
-- These extend the existing person record, no new profile table
ALTER TABLE trusted_person
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;