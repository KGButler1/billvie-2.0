/*
# Document Attachments and Household-Documents Storage Bucket

## Purpose
Replaces the broken base64-in-memory attachment system with real file storage
in Supabase Storage. Important Documents, Tax Documents, and scanned bills all
share one household-scoped private storage bucket and one attachment metadata
table.

## New Table: document_attachments
One row per uploaded file. `owner_type` + `owner_id` is polymorphic — points at
either a `documents` row or a `tax_documents` row, same pattern as
`document_links.source_type`. No FK on `owner_id` since it is polymorphic.

Columns:
- id (uuid PK, default gen_random_uuid())
- household_id (uuid, NOT NULL, references households)
- owner_type (text, NOT NULL, CHECK in ('document', 'tax_document'))
- owner_id (uuid, NOT NULL)
- storage_path (text, NOT NULL) — path within the household-documents bucket
- thumbnail_path (text, nullable) — path to a generated PDF thumbnail JPEG
- file_name (text, NOT NULL) — original file name for display
- mime_type (text, NOT NULL)
- file_size (bigint, NOT NULL)
- created_at (timestamptz, default now())

## Security (RLS)
- document_attachments: RLS enabled. Write access (INSERT/UPDATE/DELETE) gated
  on household membership via is_household_member(). Read access (SELECT) defers
  to whether the caller can already see the parent row (documents or
  tax_documents), inheriting the existing exclusion + professional-access logic
  rather than duplicating it.
- storage.objects for household-documents bucket: four policies (SELECT, INSERT,
  UPDATE, DELETE) all gated on household membership by checking the first path
  segment (the household id) via storage.foldername(name)[1].

## New Storage Bucket
- household-documents (private, not public). Path convention:
  {household_id}/{owner_type}/{owner_id}/{attachment_id}.{ext}
  {household_id}/{owner_type}/{owner_id}/{attachment_id}-thumb.jpg

## Notes
1. The existing bill-scans bucket and its objects are left untouched. New scan
   uploads simply stop targeting it.
2. Storage-level access is checked at household membership only. Finer-grained
   exclusion and professional access rules live on the document_attachments row
   itself, which the app always checks first before asking storage for a signed
   URL. Storage RLS is the backstop, not the primary gate.
3. No changes to documents, tax_documents, document_links, or any existing table.
*/

-- 1. New table
CREATE TABLE IF NOT EXISTS document_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  owner_type text NOT NULL CHECK (owner_type IN ('document', 'tax_document')),
  owner_id uuid NOT NULL,
  storage_path text NOT NULL,
  thumbnail_path text,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE document_attachments IS 'One row per uploaded file. owner_type + owner_id points at either a documents row or a tax_documents row, same pattern as document_links.source_type. No FK on owner_id since it is polymorphic.';

ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;

-- Write access: plain household membership
DROP POLICY IF EXISTS "insert_document_attachments" ON document_attachments;
CREATE POLICY "insert_document_attachments" ON document_attachments
  FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "update_document_attachments" ON document_attachments;
CREATE POLICY "update_document_attachments" ON document_attachments
  FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id))
  WITH CHECK (is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "delete_document_attachments" ON document_attachments;
CREATE POLICY "delete_document_attachments" ON document_attachments
  FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- Read access: defer to whether caller can already see the parent row
DROP POLICY IF EXISTS "read_document_attachments" ON document_attachments;
CREATE POLICY "read_document_attachments" ON document_attachments
  FOR SELECT TO authenticated
  USING (
    (owner_type = 'document' AND EXISTS (
      SELECT 1 FROM documents d WHERE d.id = document_attachments.owner_id
    ))
    OR
    (owner_type = 'tax_document' AND EXISTS (
      SELECT 1 FROM tax_documents td WHERE td.id = document_attachments.owner_id
    ))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS document_attachments_owner_idx
  ON document_attachments (owner_type, owner_id);

CREATE INDEX IF NOT EXISTS document_attachments_household_idx
  ON document_attachments (household_id);

-- 2. New storage bucket (private, household-scoped)
INSERT INTO storage.buckets (id, name, public)
VALUES ('household-documents', 'household-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies — household membership via first path segment
DROP POLICY IF EXISTS "household_documents_select" ON storage.objects;
CREATE POLICY "household_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'household-documents'
    AND is_household_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "household_documents_insert" ON storage.objects;
CREATE POLICY "household_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'household-documents'
    AND is_household_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "household_documents_update" ON storage.objects;
CREATE POLICY "household_documents_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'household-documents'
    AND is_household_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
  WITH CHECK (
    bucket_id = 'household-documents'
    AND is_household_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "household_documents_delete" ON storage.objects;
CREATE POLICY "household_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'household-documents'
    AND is_household_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
