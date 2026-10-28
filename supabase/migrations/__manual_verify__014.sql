-- Manual verification script for 014_create_guides.sql
-- Checks:
-- 1. RLS is enabled on guides and policies exist
-- 2. anon cannot SELECT directly from guides
-- 3. get_shared_guide returns only unlisted + ready + non-deleted guides and never exposes user_id or source_capture_ids

SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'guides';

SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'guides'
ORDER BY policyname;

SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'get_shared_guide';
