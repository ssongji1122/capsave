-- CapSave: captures table
CREATE TABLE IF NOT EXISTS captures (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('place', 'text')),
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  place_name TEXT,
  address TEXT,
  extracted_text TEXT DEFAULT '',
  links JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  source TEXT DEFAULT 'other',
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captures_category ON captures(category);
CREATE INDEX IF NOT EXISTS idx_captures_created_at ON captures(created_at DESC);

-- Row Level Security (Phase 1: no auth, allow all)
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON captures FOR ALL USING (true) WITH CHECK (true);
