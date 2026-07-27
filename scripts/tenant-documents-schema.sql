-- Fruitful Rooms — Enable Tenant Documents (table + storage bucket)
-- Run this once in the Supabase SQL Editor to turn on document uploads on the
-- tenant edit page. Idempotent — safe to run more than once.
--
-- No storage RLS policies are needed: the app reads and writes documents with
-- the service-role client, which bypasses row-level security. The bucket is
-- therefore created private.

-- 1. Document metadata table
CREATE TABLE IF NOT EXISTS tenant_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('id_photo', 'pay_stub', 'other')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant
  ON tenant_documents (tenant_id, uploaded_at DESC);

-- Admin-only (service role bypasses RLS; enabling with no policy blocks anon).
ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

-- 2. Private storage bucket the upload/download routes use
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', false)
ON CONFLICT (id) DO NOTHING;
