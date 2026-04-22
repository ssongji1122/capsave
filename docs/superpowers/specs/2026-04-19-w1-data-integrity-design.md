# W1: Data Integrity (P1) — Design

**Date:** 2026-04-19
**Scope:** Council-identified P1 issues that block cross-device data correctness.
**Out of scope:** W2 (analytics/cost), W3 (code unification), W4 (Phase 2 readiness), W5 (UI polish).

## Problem

Three independent P1 bugs corrupt or misroute data:

1. **Mobile silent fallback to `file://`** — `apps/mobile/contexts/CapturesContext.tsx:117-124` catches Storage upload errors and saves the local URI to the shared `image_url` column. The image breaks on every other device.
2. **Storage RLS policy name mismatch** — `migration 006` runs `DROP POLICY IF EXISTS "Anonymous uploads"` and `"Anonymous deletes"`, but `migration 002` actually created policies named `"Anon upload captures"` and `"Anon delete captures"`. The drops are no-ops; the anonymous policies survived. Until verified, we must assume any unauthenticated client can still upload to and delete from the `captures` bucket.
3. **`sourceIndices` not consumed** — `packages/shared/src/types/capture.ts` exposes `sourceIndices?: number[]` and `parseBatchAnalysisResult` populates it, but `apps/web/src/app/(app)/dashboard/page.tsx:47-55` (`handleBatchSave`) still uses array index for image-url pairing. Merged batch results attach to the wrong source image.

## Goals

- Mobile captures store a Supabase Storage path in `image_url`, never `file://`.
- Anonymous policies on `storage.objects` for the `captures` bucket are provably gone.
- Batch analyze results pair with the correct source image regardless of merging.

## Non-goals

- Offline-queue / pending-upload retry across app restarts (W4-class).
- Merging `/api/upload` and `/api/analyze` into one route (W2).
- Image quality floor or compression strategy (W2).

## Design

### 1. Mobile pre-save upload

Move the Storage upload from `CapturesContext.saveCapture` to `apps/mobile/app/capture/analyze.tsx`. After `runAnalysis()` succeeds, immediately upload the manipulated image and hold the returned `storagePath` in component state. The "저장" button only fires DB inserts (SQLite + Supabase row).

**State machine in `analyze.tsx`:**

```
analyzing → done(storagePath) → saving → saved
                ↓ upload fails
            upload_error (retry button)
```

- Add `uploadStatus: 'idle' | 'uploading' | 'done' | 'error'` and `storagePath: string | null`.
- After analysis success: kick off upload, show subtle "업로드 중" indicator below result card.
- On upload success: enable "저장" button.
- On upload failure: replace "저장" with "다시 업로드" button + error message.
- Save button calls `saveCapture(result, storagePath)` — no upload happens here.

**`CapturesContext.saveCapture` changes:**

- Drop the `if (imageUrl.startsWith('file://') || imageUrl.startsWith('/'))` block entirely.
- The `imageUrl` parameter is renamed to `storagePath` for clarity and is treated as opaque.
- If it still receives a `file://` URI (defensive), throw immediately so callers can't slip through.

### 2. Migration 008 — RLS cleanup

New file `supabase/migrations/008_cleanup_storage_policies.sql`:

- Drop both naming variants for upload + delete (the actually-created names from 002 and the names 006 attempted).
- Re-assert the user-scoped policies from 006 idempotently (`DROP IF EXISTS` then `CREATE`).
- Add a verification `DO $$ ... $$` block that raises an exception if any policy on `storage.objects` matching `bucket_id = 'captures'` is granted to `anon` or `public`.

Names to drop (both variants):

```
"Public read captures"           -- 002 SELECT (already replaced by 007, drop defensively)
"Anon upload captures"           -- 002 INSERT actual
"Anonymous uploads"              -- 006 INSERT intended
"Anon delete captures"           -- 002 DELETE actual
"Anonymous deletes"              -- 006 DELETE intended
"Anyone can view captures"       -- 006 SELECT (already dropped by 007, defensive)
```

Then re-create the authenticated user-scoped policies that should remain.

### 3. Batch save uses `sourceIndices`

Extract a pure function `pairResultsWithImages` to `apps/web/src/lib/batch-save-mapper.ts`:

```ts
export function pairResultsWithImages(
  results: AnalysisResult[],
  imageUrls: string[]
): Array<{ result: AnalysisResult; imageUrl: string }>
```

Logic:

- For each result, prefer `result.sourceIndices?.[0]` to pick the image URL.
- Fallback to result-array index when `sourceIndices` is missing/empty (back-compat).
- Clamp the chosen index to `[0, imageUrls.length - 1]`.

Update `dashboard/page.tsx:handleBatchSave` to call the pure function.

## Testing (TDD)

### Mobile

`apps/mobile/services/__tests__/upload-flow.test.ts` — pure-logic helper extracted from `analyze.tsx`:

- `prepareUpload(localUri, userId)` returns `{ path, blob }` deterministically.
- Mocked Storage client; assert path format `userId/timestamp_random.jpg`.
- Failure: rejected promise surfaces error message verbatim.

(The screen component itself is integration-tested manually via simulator — Jest cannot drive React Native UI in this repo.)

### Web

`apps/web/src/__tests__/lib/batch-save-mapper.test.ts` for `pairResultsWithImages`:

- 3 results, 3 images, no merging → identity mapping.
- 1 merged result with `sourceIndices: [0, 1, 2]` → uses imageUrls[0].
- 2 results: `[sourceIndices: [0, 2]]`, `[sourceIndices: [1]]` → first uses imageUrls[0], second uses imageUrls[1].
- Missing `sourceIndices` → falls back to result-array index.
- Out-of-range index → clamps to last image URL.

### Migration

`supabase/migrations/__manual_verify__008.sql` (committed reference, not auto-run):

```sql
SELECT polname, polroles::regrole[]
FROM pg_policy
WHERE polrelid = 'storage.objects'::regclass
  AND polname ILIKE '%capture%';
-- Expected: only authenticated-role policies remain
```

## Migration & rollout

- Migration 008 is additive + corrective. Safe to apply on prod immediately.
- Mobile change ships in next Expo build. Until that build, existing devices keep writing `file://` — acceptable for the alpha userbase.
- Web `dashboard/page.tsx` change is backward-compatible (fallback to index when `sourceIndices` missing).

## Risks

- **Mobile UX regression:** users now wait for upload before "저장" enables. Mitigation: upload runs in parallel with the user reading the result card; for sub-1MB images on LTE this is <1s.
- **Migration 008 verification:** if the verification block fails, the migration aborts mid-transaction. This is the intended safety behavior — a partial state is worse than a halt.
- **Batch merging edge case:** when Gemini returns `sourceIndices: []` (empty array), the fallback to result-array index kicks in. Documented in the test.

## File touch list

- `apps/mobile/app/capture/analyze.tsx` (modify)
- `apps/mobile/contexts/CapturesContext.tsx` (modify — remove fallback)
- `apps/mobile/services/upload-flow.ts` (new — extracted pure helper)
- `apps/mobile/services/__tests__/upload-flow.test.ts` (new)
- `supabase/migrations/008_cleanup_storage_policies.sql` (new)
- `supabase/migrations/__manual_verify__008.sql` (new — reference query)
- `apps/web/src/lib/batch-save-mapper.ts` (new)
- `apps/web/src/__tests__/lib/batch-save-mapper.test.ts` (new)
- `apps/web/src/app/(app)/dashboard/page.tsx` (modify — call mapper)
