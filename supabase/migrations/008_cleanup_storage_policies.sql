-- Migration 008: Clean up orphaned anon storage policies for the captures bucket.
--
-- Migration 006 attempted to drop "Anonymous uploads" / "Anonymous deletes" but the
-- actual names created by migration 002 were "Anon upload captures" / "Anon delete captures".
-- The drops were no-ops; until this migration runs we must assume any unauthenticated client
-- can still upload to and delete from the captures bucket.
--
-- This migration drops both naming variants defensively, re-asserts the user-scoped
-- policies idempotently, and verifies no anon/public policies remain on the bucket.

-- 1. Drop both naming variants (idempotent)
DROP POLICY IF EXISTS "Public read captures" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload captures" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete captures" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous deletes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view captures" ON storage.objects;

-- 2. Re-assert the user-scoped policies idempotently
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
CREATE POLICY "Users can upload their own files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'captures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'captures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own captures" ON storage.objects;
CREATE POLICY "Users can read own captures"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'captures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Ensure bucket is private (defensive — 007 already did this)
UPDATE storage.buckets SET public = false WHERE id = 'captures';

-- 4. Verification: abort if any anon/public policy on storage.objects still references
--    the captures bucket.
DO $$
DECLARE
  bad_count INT;
BEGIN
  SELECT COUNT(*)
  INTO bad_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND (
      'anon' = ANY(roles)
      OR 'public' = ANY(roles)
    )
    AND (
      qual ILIKE '%captures%'
      OR with_check ILIKE '%captures%'
      OR policyname ILIKE '%capture%'
    );

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Migration 008 verification failed: % anon/public policies still reference the captures bucket',
      bad_count;
  END IF;
END $$;
