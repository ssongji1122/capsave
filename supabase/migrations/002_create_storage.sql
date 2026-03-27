-- Storage bucket for capture images
INSERT INTO storage.buckets (id, name, public)
VALUES ('captures', 'captures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY "Public read captures" ON storage.objects
  FOR SELECT USING (bucket_id = 'captures');

-- Allow anon upload
CREATE POLICY "Anon upload captures" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'captures');

-- Allow anon delete
CREATE POLICY "Anon delete captures" ON storage.objects
  FOR DELETE USING (bucket_id = 'captures');
