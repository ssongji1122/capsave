-- Migration 012: SECURITY INVOKER RPC for searching captures across all relevant fields
-- including JSONB columns (places, tags).
--
-- Why: PostgREST .or() does not reliably accept ::text cast in filter expressions.
-- Wrapping the OR in SQL guarantees JSONB stringified ILIKE works and keeps a single
-- round-trip. SECURITY INVOKER preserves RLS — users only see their own non-deleted rows.

CREATE OR REPLACE FUNCTION search_user_captures(
  search_query TEXT,
  search_limit INT DEFAULT 20,
  search_offset INT DEFAULT 0
)
RETURNS SETOF captures
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT *
  FROM captures
  WHERE deleted_at IS NULL
    AND (
      title ILIKE '%' || search_query || '%'
      OR summary ILIKE '%' || search_query || '%'
      OR extracted_text ILIKE '%' || search_query || '%'
      OR places::text ILIKE '%' || search_query || '%'
      OR tags::text ILIKE '%' || search_query || '%'
    )
  ORDER BY created_at DESC
  LIMIT search_limit
  OFFSET search_offset;
$$;

GRANT EXECUTE ON FUNCTION search_user_captures(TEXT, INT, INT) TO authenticated;
