-- Fruitful Rooms — Property Health Tracker schema
-- Run this in the Supabase SQL Editor (or via scripts/run-schema.ts pointed at this file).
-- Safe to run more than once: uses IF NOT EXISTS / idempotent guards.

-- ─── Track when a room became vacant (powers vacancy aging in the health score) ──
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS vacant_since TIMESTAMPTZ;

-- Backfill: any room currently vacant with no timestamp is treated as freshly
-- vacant as of now, so existing data isn't unfairly penalized on first load.
UPDATE rooms SET vacant_since = now()
WHERE status = 'vacant' AND vacant_since IS NULL;

-- ─── Maintenance / upkeep completion log ─────────────────────────────────────
-- Append-only history: one row = "task X was done on property Y on date Z".
-- The most recent row per (property_id, task_type) drives the cadence health.
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cost NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_property_task
  ON maintenance_logs (property_id, task_type, completed_at DESC);

-- ─── Ad-hoc maintenance issues (open problems, distinct from scheduled tasks) ──
CREATE TABLE IF NOT EXISTS maintenance_issues (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  cost NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_issues_property_status
  ON maintenance_issues (property_id, status);

-- ─── RLS: admin-only. Service role bypasses RLS; enabling with no policy
--     simply blocks the public anon key from reading/writing these tables. ─────
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_issues ENABLE ROW LEVEL SECURITY;
