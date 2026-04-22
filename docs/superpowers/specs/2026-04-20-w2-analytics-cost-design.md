# W2: Analytics & Cost (P2) — Design

**Date:** 2026-04-20
**Scope:** Council-identified P2 issues that block Phase 1 validation accuracy and waste server resources.
**Out of scope:** W1 (data integrity, in flight as PR #5), W3 (code unification), W4 (Phase 2 readiness), W5 (UI polish).

## Problem

1. **Capture DAU instead of session DAU** — `apps/web/src/app/api/cron/dau/route.ts` and SQL function `count_dau()` count `distinct user_id WHERE captures.created_at = today`. A power user batch-uploading 10 old screenshots can single-handedly trigger the Phase 1 gate. The metric must reflect "10 humans opened the app today", not "captures saved today".
2. **Double upload + analyze for authenticated single capture** — `AnalyzeModal.tsx` issues `POST /api/upload` and `POST /api/analyze` in parallel, sending the file twice. Doubles bandwidth + Vercel function invocations + risks `/api/upload` succeeding while `/api/analyze` fails (orphaned object).
3. **Aggressive image compression destroys OCR text** — `resizeImageFile` and mobile `ImageManipulator` use `quality: 0.7` and `width: 800`. For text-heavy screenshots (menus, receipts, Threads posts) this corrupts pixels Gemini needs to read place names accurately.

## Goals

- DAU reflects distinct authenticated users who interacted with any API today.
- Authenticated single-image capture sends the file exactly once.
- Image upload preserves text legibility: minimum JPEG quality 0.85, only downsize if width > 2048px.

## Non-goals

- Batch analyze pipeline — keep `/api/upload` + `/api/analyze-batch` as-is for this PR (different routing, larger refactor).
- Guest analyze pipeline — keep `/api/analyze` as guest-only path (no Storage permissions for anon).
- Redesigning the cron schedule, threshold, or notification template.
- Moving DAU notification to a different channel.

## Design

### 1. Session-based DAU

**New table** (migration 009):

```sql
CREATE TABLE user_activity (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_last_seen ON user_activity(last_seen_at);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
-- Users can read their own row (debug/profile use)
CREATE POLICY "Users read own activity" ON user_activity FOR SELECT USING (auth.uid() = user_id);
-- Writes happen via SECURITY DEFINER function only (service role)
```

**SQL helper:**

```sql
CREATE OR REPLACE FUNCTION touch_user_seen(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_activity (user_id, last_seen_at)
  VALUES (_user_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;
END $$;
```

**Updated `count_dau()`:**

```sql
CREATE OR REPLACE FUNCTION count_dau() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _count FROM user_activity
  WHERE last_seen_at >= CURRENT_DATE
    AND last_seen_at < CURRENT_DATE + INTERVAL '1 day';

  INSERT INTO analytics.dau (date, distinct_users)
  VALUES (CURRENT_DATE, _count)
  ON CONFLICT (date) DO UPDATE SET distinct_users = EXCLUDED.distinct_users;
END $$;
```

**Application helper** in `packages/shared/src/supabase/queries.ts`:

```ts
export async function touchUserSeen(client: SupabaseClient, userId: string): Promise<void> {
  await client.rpc('touch_user_seen', { _user_id: userId });
}
```

**Wiring** — call `touchUserSeen` in every authenticated API route after the user is verified, fire-and-forget (do not block on it; log errors). Routes touched:
- `/api/analyze` (authenticated path)
- `/api/analyze-batch`
- `/api/upload`
- `/api/image`
- `/api/geocode`
- `/api/capture` (new, see §2)

**Cron route update** — `/api/cron/dau` no longer queries `captures`. It calls `count_dau()` (now session-based) and reads back the upserted row to drive the milestone check.

### 2. Single `/api/capture` route

New route `apps/web/src/app/api/capture/route.ts`:

- Accepts `multipart/form-data` with one `file` field.
- Bearer/cookie auth (same pattern as `/api/analyze`).
- Validates content-type (jpeg/png/webp) and size (≤5MB) — same rules as `/api/upload`.
- Uploads original to Storage at `userId/timestamp_random.jpg`.
- Resizes in-memory for Gemini (sharp, max 2048px width, quality 0.85).
- Calls Gemini.
- Returns `{ result: AnalysisResult, storagePath: string }`.

`AnalyzeModal.tsx` (authenticated branch only) replaces the parallel `/api/upload` + `/api/analyze` calls with a single `POST /api/capture`. Guest branch is unchanged.

`/api/upload` and `/api/analyze` remain (batch + guest still use them).

### 3. Image quality floor

`apps/web/src/lib/image-utils.ts` `resizeImageFile`:
- Default `maxWidth` from `1024` → `2048`.
- Default `quality` from `0.7` → `0.85`.
- Only downscale when `img.width > maxWidth` (no upscaling).

`apps/mobile/services/analyzers/server-analyzer.ts`:
- `ImageManipulator.manipulateAsync` `compress: 0.7` → `0.85`, width `1024` → `2048`, only resize if input width exceeds threshold.

`apps/web/src/app/api/capture/route.ts` (new) and existing `/api/analyze` server-side sharp pipeline — same floor.

## Testing (TDD)

### W2.1 — DAU

Pure-logic helper `apps/web/src/lib/dau-counter.ts` extracted from the cron route:

- `shouldNotify(distinctUsers, threshold, alreadyNotified): boolean`

Tests in `apps/web/src/__tests__/lib/dau-counter.test.ts`:
- Below threshold → no notify.
- At threshold + not notified → notify.
- Above threshold + already notified → no notify.

(The actual `touch_user_seen` call is integration-level — verified manually via SQL after migration applies.)

### W2.2 — `/api/capture`

`apps/web/src/__tests__/api/capture-route.test.ts`:
- Rejects request without auth.
- Rejects oversize file (>5MB).
- Rejects unsupported content-type.
- Happy path with mocked Gemini + mocked Storage upload returns `{ result, storagePath }`.

(Use the existing test utilities from `gemini.test.ts` and `image-utils.test.ts` for mocks.)

### W2.3 — Image utils

Extend `apps/web/src/__tests__/lib/image-utils.test.ts` (already exists per repo audit):
- New test: `resizeImageFile` returns blob unchanged when input width ≤ maxWidth.
- New test: defaults are `maxWidth=2048, quality=0.85`.

## Migration & rollout

- Migration 009 is additive. `user_activity` starts empty; first authenticated request after deploy populates.
- Cron route change ships in same web deploy; until then DAU still reads from captures (acceptable — Phase 1 not yet hit).
- `/api/capture` ships as new route, `AnalyzeModal` switches to it. `/api/upload` + `/api/analyze` remain working (batch + guest depend on them).
- Image quality change is purely client/server-side compression — no schema change.

## Risks

- **DAU regression to zero on day 1**: until the first authenticated request hits the new helper, `user_activity` is empty. Phase 1 milestone re-check resets the clock by ~24h. Acceptable: we're under threshold anyway.
- **`touch_user_seen` adds 1 RPC per authenticated request**: ~5–10ms per call. Fire-and-forget in route handlers; errors logged but never block the response.
- **Larger images = slower Gemini latency**: 2048×… JPEG @0.85 is ~2× the size of current 800×… @0.7. Within Gemini's 4MB inline-image limit; latency increase ≈ 200–500ms per analyze. Trade-off explicitly accepted: OCR quality > speed.

## File touch list

**New:**
- `supabase/migrations/009_user_activity_session_dau.sql`
- `supabase/migrations/__manual_verify__009.sql`
- `packages/shared/src/supabase/queries.ts` — append `touchUserSeen`
- `apps/web/src/lib/dau-counter.ts`
- `apps/web/src/__tests__/lib/dau-counter.test.ts`
- `apps/web/src/app/api/capture/route.ts`
- `apps/web/src/__tests__/api/capture-route.test.ts`

**Modified:**
- `apps/web/src/app/api/cron/dau/route.ts` — switch source + use shouldNotify helper
- `apps/web/src/app/api/analyze/route.ts` — call `touchUserSeen` for authed users
- `apps/web/src/app/api/analyze-batch/route.ts` — call `touchUserSeen`
- `apps/web/src/app/api/upload/route.ts` — call `touchUserSeen`
- `apps/web/src/app/api/image/route.ts` — call `touchUserSeen`
- `apps/web/src/app/api/geocode/route.ts` — call `touchUserSeen`
- `apps/web/src/components/upload/AnalyzeModal.tsx` — use `/api/capture` for authed branch
- `apps/web/src/lib/image-utils.ts` — defaults 2048 / 0.85, no upscale
- `apps/mobile/services/analyzers/server-analyzer.ts` — quality 0.85, 2048 max
