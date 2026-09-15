ALTER TABLE attention_dismissals
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS detail text;
