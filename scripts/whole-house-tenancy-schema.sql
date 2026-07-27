-- Fruitful Rooms — Whole-house tenancy support
-- Lets a tenant be assigned directly to a whole-house property (no room).
-- Run once in the Supabase SQL Editor. Idempotent.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS property_id BIGINT REFERENCES properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_property ON tenants (property_id);
