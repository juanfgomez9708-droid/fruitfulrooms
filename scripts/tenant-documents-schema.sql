-- Fruitful Rooms — Tenant Documents table
-- Optional: run this in the Supabase SQL Editor to enable document uploads on the
-- tenant edit page. The app works without it (documents simply show as empty),
-- but uploads require this table AND a Storage bucket named "tenant-documents".
-- Idempotent — safe to run more than once.

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
