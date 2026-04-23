-- Migration 008: Enforce free-tier capture limit at the database level
-- Replaces the permissive insert policy with one that caps saves at MAX_FREE_CAPTURES (10).
-- This closes the client-side bypass: even direct REST calls to Supabase are rejected
-- when the user already has 10 non-deleted captures.

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
    ) < 10
  );
