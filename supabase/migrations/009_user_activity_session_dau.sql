-- Migration 009: Session-based DAU
--
-- Capture DAU (count of distinct users with captures.created_at = today) is gameable:
-- one user batch-uploading 10 old screenshots can single-handedly trigger the Phase 1 gate.
-- Switch to session DAU: count distinct users who hit any authenticated API today.

-- 1. user_activity table — one row per user, last_seen_at upserted on every authed request
CREATE TABLE IF NOT EXISTS user_activity (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_last_seen ON user_activity(last_seen_at);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own activity" ON user_activity;
CREATE POLICY "Users read own activity"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

-- Writes happen via SECURITY DEFINER function only (callable by anon for benign upserts).

-- 2. touch_user_seen — upsert helper
CREATE OR REPLACE FUNCTION touch_user_seen(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO user_activity (user_id, last_seen_at)
  VALUES (_user_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;
END $$;

GRANT EXECUTE ON FUNCTION touch_user_seen(UUID) TO authenticated, anon, service_role;

-- 3. Read helper for the cron route (returns distinct_users + notified flag for today)
CREATE OR REPLACE FUNCTION get_dau_today()
RETURNS TABLE(distinct_users INT, notified BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(d.distinct_users, 0)::INT,
    (d.notified_at IS NOT NULL)
  FROM analytics.dau d
  WHERE d.date = CURRENT_DATE
  LIMIT 1;
END $$;

GRANT EXECUTE ON FUNCTION get_dau_today() TO authenticated, service_role;

-- 4. Replace count_dau() to read from user_activity instead of captures
CREATE OR REPLACE FUNCTION count_dau()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
DECLARE
  _count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO _count
  FROM user_activity
  WHERE last_seen_at >= CURRENT_DATE
    AND last_seen_at < CURRENT_DATE + INTERVAL '1 day';

  INSERT INTO analytics.dau (date, distinct_users)
  VALUES (CURRENT_DATE, _count)
  ON CONFLICT (date)
  DO UPDATE SET distinct_users = EXCLUDED.distinct_users;
END $$;
