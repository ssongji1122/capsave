-- Manual verification query for migration 008.
-- Run this in the Supabase SQL editor after applying 008 to confirm only
-- authenticated policies remain on storage.objects for the captures bucket.

SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    policyname ILIKE '%capture%'
    OR qual ILIKE '%captures%'
    OR with_check ILIKE '%captures%'
  )
ORDER BY policyname;

-- Expected: rows only with roles = {authenticated}, no {anon} or {public}.
