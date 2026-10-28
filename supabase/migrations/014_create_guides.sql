-- Migration 014: user-made guides from captures
-- Body is a JSONB snapshot shaped like PublicGuide (packages/shared/src/types/guide.ts).
-- Sharing goes through get_shared_guide(slug) only; there is no anon policy on the table.

CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 12 AND 80),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 400),
  body JSONB NOT NULL CHECK (jsonb_typeof(body) = 'object'),
  schema_version SMALLINT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted')),
  source_capture_ids BIGINT[] NOT NULL DEFAULT '{}',
  generation JSONB NOT NULL DEFAULT '{}'::jsonb,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_guides_user_created
  ON guides(user_id, created_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own guides"
  ON guides FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Same pattern as captures (migration 013): cap enforced in the database.
-- MUST stay in sync with MAX_GUIDES_PER_USER in packages/shared.
CREATE POLICY "Users insert own guides"
  ON guides FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      SELECT COUNT(*) FROM guides
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    ) < 20
  );

CREATE POLICY "Users update own guides"
  ON guides FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: deletion is a soft delete through UPDATE deleted_at.

CREATE OR REPLACE FUNCTION set_guides_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER guides_set_updated_at
  BEFORE UPDATE ON guides
  FOR EACH ROW EXECUTE FUNCTION set_guides_updated_at();

-- Read one shared guide by exact slug. Never lists, never returns owner or source ids.
CREATE OR REPLACE FUNCTION get_shared_guide(p_slug TEXT)
RETURNS TABLE (slug TEXT, title TEXT, description TEXT, body JSONB, updated_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.slug, g.title, g.description, g.body, g.updated_at
  FROM guides g
  WHERE g.slug = p_slug
    AND g.visibility = 'unlisted'
    AND g.status = 'ready'
    AND g.deleted_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_shared_guide(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_shared_guide(TEXT) TO anon, authenticated;
