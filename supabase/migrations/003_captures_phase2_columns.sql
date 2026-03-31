-- Migration 003: Phase 2 captures schema updates
-- Adds: places JSONB, user_id, confidence, reclassified_at, deleted_at, source_account_id
-- Enables: REPLICA IDENTITY FULL for Supabase Realtime + RLS

-- 1. Add places JSONB column (formalizes what code already writes)
ALTER TABLE captures ADD COLUMN IF NOT EXISTS places JSONB DEFAULT '[]'::jsonb;

-- 2. Add user_id for RLS (nullable initially — backfill existing rows later)
ALTER TABLE captures ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Add confidence score from AI analysis (0.0–1.0, nullable for existing rows)
ALTER TABLE captures ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT NULL;

-- 4. Add reclassified_at for uncertain queue reclassification tracking
ALTER TABLE captures ADD COLUMN IF NOT EXISTS reclassified_at TIMESTAMPTZ DEFAULT NULL;

-- 5. Add soft-delete column
ALTER TABLE captures ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 6. Add source_account_id for Phase 3 full post fetch
ALTER TABLE captures ADD COLUMN IF NOT EXISTS source_account_id TEXT DEFAULT NULL;

-- 7. Index on user_id (required for RLS performance)
CREATE INDEX IF NOT EXISTS idx_captures_user_id ON captures(user_id);

-- 8. Index for soft-delete filter (most queries exclude deleted rows)
CREATE INDEX IF NOT EXISTS idx_captures_deleted_at ON captures(deleted_at) WHERE deleted_at IS NULL;

-- 9. REPLICA IDENTITY FULL — required for Supabase Realtime + RLS
-- Without this, Realtime silently drops rows when RLS is enabled.
-- Trade-off: increases WAL size per row. Acceptable at current volume.
ALTER TABLE captures REPLICA IDENTITY FULL;

-- 10. Drop legacy single-place columns (superseded by places JSONB)
-- Safe: saveCapture() already writes to places, not place_name/address
ALTER TABLE captures DROP COLUMN IF EXISTS place_name;
ALTER TABLE captures DROP COLUMN IF EXISTS address;

-- 11. Replace permissive RLS policy with user-scoped policy
DROP POLICY IF EXISTS "Allow all for now" ON captures;

-- Read own captures (exclude soft-deleted)
CREATE POLICY "Users read own captures"
  ON captures FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Insert own captures
CREATE POLICY "Users insert own captures"
  ON captures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update own captures
CREATE POLICY "Users update own captures"
  ON captures FOR UPDATE
  USING (auth.uid() = user_id);

-- Delete own captures (soft or hard)
CREATE POLICY "Users delete own captures"
  ON captures FOR DELETE
  USING (auth.uid() = user_id);
