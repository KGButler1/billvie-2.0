ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS scan_sourced boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN documents.scan_sourced IS 'true when this document was auto-created by the bill-scan pipeline; hidden from the Important Documents list but still reachable via the bill source_document_id link';
