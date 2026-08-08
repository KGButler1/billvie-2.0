/*
# Bill Scan Storage Bucket
Creates a private storage bucket for bill scan document uploads.
Household members can read/write to their own household's folder.
*/
INSERT INTO storage.buckets (id, name, public)
VALUES ('bill-scans', 'bill-scans', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "bill_scans_read_own" ON storage.objects;
CREATE POLICY "bill_scans_read_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bill-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "bill_scans_insert_own" ON storage.objects;
CREATE POLICY "bill_scans_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bill-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "bill_scans_update_own" ON storage.objects;
CREATE POLICY "bill_scans_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bill-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'bill-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "bill_scans_delete_own" ON storage.objects;
CREATE POLICY "bill_scans_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bill-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );