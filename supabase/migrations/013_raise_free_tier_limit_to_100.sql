-- Migration 013: Raise free-tier capture limit from 10 to 100
-- Rationale: dogfood phase needs more headroom. 10명 internal beta users average
-- 20-50 captures/week from SNS screenshots; cap of 10 hits the wall in days.
-- Keep the DB-level enforcement (closes client bypass) but at a higher ceiling.
--
-- MUST stay in sync with MAX_FREE_CAPTURES in packages/shared/src/supabase/queries.ts.

DROP POLICY IF EXISTS "Users insert own captures" ON captures;

CREATE POLICY "Users insert own captures"
  ON captures FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      SELECT COUNT(*)
      FROM captures
      WHERE user_id = auth.uid()
        AND deleted_at IS NULL
    ) < 100
  );
