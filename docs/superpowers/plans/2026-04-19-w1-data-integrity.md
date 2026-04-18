# W1 Data Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three P1 data-integrity bugs identified by the agent council: mobile silent fallback to `file://`, Storage RLS policy name mismatch, and BatchAnalyzeModal ignoring `sourceIndices`.

**Architecture:** Mobile uploads images to Supabase Storage immediately after AI analysis (before the user presses Save). A new migration cleans up orphaned anon RLS policies. A pure-function mapper pairs batch analysis results with their source images using `sourceIndices`.

**Tech Stack:** Expo (React Native, TypeScript, Jest), Next.js 15 (TypeScript, Vitest), Supabase (Postgres + Storage RLS).

**Spec:** `docs/superpowers/specs/2026-04-19-w1-data-integrity-design.md`

---

## File Structure

**New files:**
- `apps/mobile/services/upload-flow.ts` — pure helper for upload preparation (testable)
- `apps/mobile/services/__tests__/upload-flow.test.ts`
- `apps/web/src/lib/batch-save-mapper.ts` — pure mapper for results ↔ image URLs
- `apps/web/src/__tests__/lib/batch-save-mapper.test.ts`
- `supabase/migrations/008_cleanup_storage_policies.sql`
- `supabase/migrations/__manual_verify__008.sql` — reference query (not auto-run)

**Modified files:**
- `apps/mobile/app/capture/analyze.tsx` — add upload step + state machine
- `apps/mobile/contexts/CapturesContext.tsx` — remove file:// fallback, treat imageUrl as opaque storage path
- `apps/web/src/app/(app)/dashboard/page.tsx` — replace inline mapping with pure function call

---

## Task 1: Web — pure mapper test (RED)

**Files:**
- Create: `apps/web/src/__tests__/lib/batch-save-mapper.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/__tests__/lib/batch-save-mapper.test.ts
import { describe, it, expect } from 'vitest';
import { pairResultsWithImages } from '@/lib/batch-save-mapper';
import type { AnalysisResult } from '@scrave/shared';

const r = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
  category: 'text',
  title: 't',
  summary: '',
  places: [],
  extractedText: '',
  links: [],
  tags: [],
  source: 'other',
  confidence: 1,
  sourceAccountId: null,
  ...overrides,
});

describe('pairResultsWithImages', () => {
  it('pairs identity-mapped results when no merging', () => {
    const results = [r(), r(), r()];
    const urls = ['a', 'b', 'c'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
      { result: results[1], imageUrl: 'b' },
      { result: results[2], imageUrl: 'c' },
    ]);
  });

  it('uses sourceIndices[0] for a merged result', () => {
    const results = [r({ sourceIndices: [0, 1, 2] })];
    const urls = ['a', 'b', 'c'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
    ]);
  });

  it('uses sourceIndices when results are partially merged', () => {
    const results = [
      r({ sourceIndices: [0, 2] }),
      r({ sourceIndices: [1] }),
    ];
    const urls = ['a', 'b', 'c'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
      { result: results[1], imageUrl: 'b' },
    ]);
  });

  it('falls back to result-array index when sourceIndices missing', () => {
    const results = [r(), r()];
    const urls = ['a', 'b'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
      { result: results[1], imageUrl: 'b' },
    ]);
  });

  it('falls back to result-array index when sourceIndices empty array', () => {
    const results = [r({ sourceIndices: [] }), r({ sourceIndices: [] })];
    const urls = ['a', 'b'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
      { result: results[1], imageUrl: 'b' },
    ]);
  });

  it('clamps out-of-range index to last image URL', () => {
    const results = [r({ sourceIndices: [99] })];
    const urls = ['a', 'b'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'b' },
    ]);
  });

  it('clamps when imageUrls is empty (defensive — should never happen)', () => {
    const results = [r()];
    expect(pairResultsWithImages(results, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/lib/batch-save-mapper.test.ts`
Expected: FAIL — module `@/lib/batch-save-mapper` not found.

---

## Task 2: Web — implement pure mapper (GREEN)

**Files:**
- Create: `apps/web/src/lib/batch-save-mapper.ts`

- [ ] **Step 1: Write minimal implementation**

```ts
// apps/web/src/lib/batch-save-mapper.ts
import type { AnalysisResult } from '@scrave/shared';

export function pairResultsWithImages(
  results: AnalysisResult[],
  imageUrls: string[]
): Array<{ result: AnalysisResult; imageUrl: string }> {
  if (imageUrls.length === 0) return [];
  const lastIdx = imageUrls.length - 1;

  return results.map((result, i) => {
    const preferred = result.sourceIndices?.[0];
    const chosen = typeof preferred === 'number' ? preferred : i;
    const clamped = Math.max(0, Math.min(chosen, lastIdx));
    return { result, imageUrl: imageUrls[clamped] };
  });
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/__tests__/lib/batch-save-mapper.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/batch-save-mapper.ts apps/web/src/__tests__/lib/batch-save-mapper.test.ts
git commit -m "feat(web): add pairResultsWithImages mapper using sourceIndices"
```

---

## Task 3: Web — wire mapper into dashboard

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx:47-55`

- [ ] **Step 1: Apply the edit**

Replace the existing `handleBatchSave`:

```tsx
const handleBatchSave = async (results: AnalysisResult[], imageUrls: string[]) => {
  const pairs = pairResultsWithImages(results, imageUrls);
  for (const { result, imageUrl } of pairs) {
    await saveCapture(result, imageUrl);
  }
  setBatchFiles(null);
};
```

And add the import at the top of the file (after the existing `@scrave/shared` import):

```tsx
import { pairResultsWithImages } from '@/lib/batch-save-mapper';
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Run web test suite**

Run: `cd apps/web && npx vitest run`
Expected: All tests pass (no regressions).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/dashboard/page.tsx
git commit -m "fix(web): use sourceIndices for batch save image pairing"
```

---

## Task 4: Migration 008 — write SQL

**Files:**
- Create: `supabase/migrations/008_cleanup_storage_policies.sql`
- Create: `supabase/migrations/__manual_verify__008.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/008_cleanup_storage_policies.sql
-- Cleanup orphaned anonymous policies on storage.objects for the captures bucket.
-- Migration 006 attempted to drop "Anonymous uploads"/"Anonymous deletes" but the actual
-- names created by migration 002 were "Anon upload captures"/"Anon delete captures".
-- Drop both naming variants defensively, then re-assert the intended user-scoped policies
-- and verify no anon/public policies remain.

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

-- 4. Verification: abort if any anon/public policy on storage.objects mentions
--    the captures bucket. We inspect the policy expression text via pg_policies.
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
```

- [ ] **Step 2: Write the manual verify reference**

```sql
-- supabase/migrations/__manual_verify__008.sql
-- Run manually after applying 008 to confirm only authenticated policies remain.
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (policyname ILIKE '%capture%' OR qual ILIKE '%captures%' OR with_check ILIKE '%captures%')
ORDER BY policyname;
-- Expected: rows only with roles = {authenticated}, no {anon} or {public}.
```

- [ ] **Step 3: Lint the SQL syntax**

Run: `cat supabase/migrations/008_cleanup_storage_policies.sql | head -5`
Expected: file exists and starts with comment header.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/008_cleanup_storage_policies.sql supabase/migrations/__manual_verify__008.sql
git commit -m "fix(db): migration 008 — clean up orphaned anon storage policies"
```

---

## Task 5: Mobile — upload-flow helper test (RED)

**Files:**
- Create: `apps/mobile/services/__tests__/upload-flow.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/services/__tests__/upload-flow.test.ts
import { buildStoragePath } from '../upload-flow';

describe('buildStoragePath', () => {
  it('returns a path of the form userId/timestamp_random.jpg', () => {
    const userId = 'abc-123';
    const path = buildStoragePath(userId, () => 1700000000000, () => 'xyz789');
    expect(path).toBe('abc-123/1700000000000_xyz789.jpg');
  });

  it('includes only safe filename chars from random', () => {
    const path = buildStoragePath('u', () => 1, () => 'AbC012');
    expect(path).toMatch(/^u\/1_[A-Za-z0-9]+\.jpg$/);
  });

  it('throws if userId is empty', () => {
    expect(() => buildStoragePath('', () => 1, () => 'r')).toThrow(/userId required/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest services/__tests__/upload-flow.test.ts`
Expected: FAIL — cannot find module `../upload-flow`.

---

## Task 6: Mobile — implement upload-flow helper (GREEN)

**Files:**
- Create: `apps/mobile/services/upload-flow.ts`

- [ ] **Step 1: Write minimal implementation**

```ts
// apps/mobile/services/upload-flow.ts

export function buildStoragePath(
  userId: string,
  now: () => number = Date.now,
  randomSuffix: () => string = defaultRandom
): string {
  if (!userId) throw new Error('userId required');
  return `${userId}/${now()}_${randomSuffix()}.jpg`;
}

function defaultRandom(): string {
  return Math.random().toString(36).substring(2, 8);
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd apps/mobile && npx jest services/__tests__/upload-flow.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/services/upload-flow.ts apps/mobile/services/__tests__/upload-flow.test.ts
git commit -m "feat(mobile): extract buildStoragePath pure helper"
```

---

## Task 7: Mobile — refactor uploadImageToStorage to use helper

**Files:**
- Modify: `apps/mobile/services/supabase.ts:31-57`

- [ ] **Step 1: Apply the edit**

Replace the body of `uploadImageToStorage` to delegate path construction to the helper:

```ts
import { buildStoragePath } from './upload-flow';

// ... existing code ...

export async function uploadImageToStorage(
  localUri: string,
  userId: string
): Promise<string> {
  const path = buildStoragePath(userId);

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('captures')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  return path;
}
```

- [ ] **Step 2: Type-check mobile**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/services/supabase.ts
git commit -m "refactor(mobile): use buildStoragePath helper in uploadImageToStorage"
```

---

## Task 8: Mobile — remove file:// fallback in CapturesContext

**Files:**
- Modify: `apps/mobile/contexts/CapturesContext.tsx:113-134`

- [ ] **Step 1: Apply the edit**

Replace the `try` block in `saveCapture` (the authenticated branch) so it no longer accepts local URIs:

```tsx
try {
  if (!imageUrl || imageUrl.startsWith('file://') || imageUrl.startsWith('/')) {
    throw new Error('saveCapture requires an uploaded storage path, not a local file URI.');
  }

  const saved = await supaSave(supabase, analysis, imageUrl, session.user.id);
  const mobileItem = toMobileCapture(saved);
  await dbSaveCapture(analysis, imageUrl);
  setCaptures((prev) => [mobileItem, ...prev]);
} catch (error) {
  Alert.alert('저장 실패', '인터넷 연결을 확인해주세요.');
  throw error;
}
```

The earlier `if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('/')))` block must be deleted — the upload step belongs to the caller now.

Also remove the unused import at the top:

```tsx
// Before:
import { supabase, uploadImageToStorage } from '@/services/supabase';
// After:
import { supabase } from '@/services/supabase';
```

- [ ] **Step 2: Type-check mobile**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: 0 errors. (`uploadImageToStorage` will be called from `analyze.tsx` in Task 9.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/contexts/CapturesContext.tsx
git commit -m "fix(mobile): remove silent file:// fallback in saveCapture"
```

---

## Task 9: Mobile — pre-save upload in analyze.tsx

**Files:**
- Modify: `apps/mobile/app/capture/analyze.tsx`

- [ ] **Step 1: Apply the edit**

Add upload state and effect. Add the new import at the top alongside the existing supabase import:

```tsx
import { supabase, uploadImageToStorage } from '@/services/supabase';
```

Add inside the `AnalyzeScreen` component, near the existing `useState` calls:

```tsx
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
const [storagePath, setStoragePath] = useState<string | null>(null);
const [uploadError, setUploadError] = useState('');
```

Add a new effect that uploads as soon as analysis succeeds, and an explicit retry handler. Place this after the existing fade-in effect:

```tsx
useEffect(() => {
  if (status !== 'done' || storagePath || uploadStatus !== 'idle') return;
  void runUpload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [status]);

const runUpload = async () => {
  if (!imageUri) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) {
    setUploadStatus('error');
    setUploadError('로그인이 필요합니다.');
    return;
  }
  setUploadStatus('uploading');
  setUploadError('');
  try {
    const path = await uploadImageToStorage(imageUri, userId);
    setStoragePath(path);
    setUploadStatus('done');
  } catch (e) {
    setUploadStatus('error');
    setUploadError(e instanceof Error ? e.message : '이미지 업로드 실패');
  }
};
```

Update `handleSave` to require `storagePath` and call save with it:

```tsx
const handleSave = async () => {
  if (!result || !storagePath) return;

  setIsSaving(true);
  try {
    await saveCapture(result, storagePath);
    await refresh();
    router.back();
  } catch (error) {
    Alert.alert('저장 실패', '캡처를 저장하는 중 오류가 발생했습니다.');
  } finally {
    setIsSaving(false);
  }
};
```

The Save button JSX should be conditionally disabled or replaced based on `uploadStatus`. Find the existing save button block (search for the button that calls `handleSave`) and wrap it:

```tsx
{uploadStatus === 'uploading' && (
  <View style={[styles.uploadIndicator, { borderColor }]}>
    <ActivityIndicator size="small" color={colors.primary} />
    <Text style={[styles.uploadText, { color: colors.textSecondary }]}>이미지 업로드 중...</Text>
  </View>
)}

{uploadStatus === 'error' && (
  <View style={[styles.uploadIndicator, { borderColor: colors.error }]}>
    <Text style={[styles.uploadText, { color: colors.error }]}>{uploadError}</Text>
    <TouchableOpacity onPress={runUpload} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
      <Ionicons name="refresh" size={16} color="#FFF" />
      <Text style={styles.retryText}>다시 업로드</Text>
    </TouchableOpacity>
  </View>
)}

{uploadStatus === 'done' && (
  <TouchableOpacity
    style={[styles.saveButton, { backgroundColor: accentColor, opacity: isSaving ? 0.6 : 1 }]}
    onPress={handleSave}
    disabled={isSaving}
  >
    {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>저장</Text>}
  </TouchableOpacity>
)}
```

(If the existing save button uses a different structure, preserve its visual design — the key invariant is that the save action only fires when `uploadStatus === 'done' && storagePath !== null`.)

Add styles to the StyleSheet at the bottom of the file:

```tsx
uploadIndicator: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  padding: 12,
  borderWidth: 1,
  borderRadius: 8,
  marginTop: 16,
},
uploadText: {
  fontSize: 14,
  flex: 1,
},
```

- [ ] **Step 2: Type-check mobile**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/capture/analyze.tsx
git commit -m "feat(mobile): upload to Storage immediately after AI analysis"
```

---

## Task 10: Verification

- [ ] **Step 1: Run full test suite — web**

Run: `cd apps/web && npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run full test suite — shared**

Run: `cd packages/shared && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Run full test suite — mobile**

Run: `cd apps/mobile && npx jest`
Expected: All tests pass.

- [ ] **Step 4: Type-check the whole monorepo**

Run: `npx turbo run typecheck --filter=...` (or `cd apps/web && npx tsc --noEmit && cd ../mobile && npx tsc --noEmit && cd ../../packages/shared && npx tsc --noEmit`)
Expected: 0 errors across all packages.

- [ ] **Step 5: Lint the SQL migration**

Manually inspect `supabase/migrations/008_cleanup_storage_policies.sql`:
- All `DROP POLICY IF EXISTS` statements present.
- All `CREATE POLICY` statements have matching `DROP POLICY IF EXISTS` directly above (idempotent).
- `DO $$ ... $$` verification block is the last statement.

- [ ] **Step 6: Commit verification log (if any changes needed)**

If any test or type-check produced changes, commit them with:
```bash
git commit -m "chore: fix issues found during W1 verification"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✓ Spec §1 mobile pre-save upload → Tasks 5–9
- ✓ Spec §2 migration 008 → Task 4
- ✓ Spec §3 batch sourceIndices → Tasks 1–3
- ✓ Spec testing requirements → Task 1, Task 5, Task 10

**Type consistency:**
- `pairResultsWithImages` signature consistent across Tasks 1, 2, 3.
- `buildStoragePath` signature consistent across Tasks 5, 6, 7.
- `UploadStatus` type defined in Task 9 only used in Task 9.

**Placeholder scan:** None.

---

## Notes for the executor

- Each commit should leave the repo in a green state (tests pass, types check). Tasks 1–2 are RED→GREEN within the same task pair; commit only after Task 2 passes.
- Migration 008 cannot be unit-tested in this repo. The verification block inside the migration itself is the safety net — if it raises, the whole migration aborts.
- The mobile state machine in Task 9 references existing color/style tokens (`colors.error`, `accentColor`, `borderColor`) that already exist in `analyze.tsx`. Do not introduce new tokens.
