-- Migration 004: Phase 2 new tables
-- Creates: user_preferences, analytics.dau, app_config

-- 1. User preferences (preferred nav app, future settings)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  preferred_nav_app TEXT DEFAULT 'tmap'
    CHECK (preferred_nav_app IN ('tmap', 'naver', 'google', 'kakao')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. Analytics schema + DAU table for Phase 1 validation gate
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.dau (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  distinct_users INTEGER NOT NULL DEFAULT 0,
  notified_at TIMESTAMPTZ DEFAULT NULL
);

-- 3. App config (key-value store for operational settings)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed: owner email must be set before pg_cron alert can fire
-- INSERT INTO app_config (key, value) VALUES ('owner_email', 'your@email.com');
-- ^ Run manually in Supabase Dashboard after migration
