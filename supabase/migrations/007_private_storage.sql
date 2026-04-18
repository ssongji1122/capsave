-- Migration 007: Make captures bucket private + update storage policies

UPDATE storage.buckets
SET public = false
WHERE id = 'captures';

DROP POLICY IF EXISTS "Anyone can view captures" ON storage.objects;

CREATE POLICY "Users can read own captures"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'captures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
