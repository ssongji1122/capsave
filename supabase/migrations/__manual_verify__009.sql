-- Manual verification for migration 009.
-- After applying, simulate a few authed users and confirm DAU count.

-- Simulate activity for 3 users
SELECT touch_user_seen('00000000-0000-0000-0000-000000000001'::uuid);
SELECT touch_user_seen('00000000-0000-0000-0000-000000000002'::uuid);
SELECT touch_user_seen('00000000-0000-0000-0000-000000000003'::uuid);

-- Run the cron-equivalent counter
SELECT count_dau();

-- Inspect today's DAU
SELECT * FROM analytics.dau WHERE date = CURRENT_DATE;
-- Expected: distinct_users = 3 (or current real count if other users have hit prod).

-- Cleanup
DELETE FROM user_activity WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid
);
