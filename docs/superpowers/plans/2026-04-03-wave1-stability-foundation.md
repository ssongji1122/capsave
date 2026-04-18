# Wave 1: Stability & Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데이터 안전성(스토리지 프라이버시), 크로스 플랫폼 이미지 동기화, 페이지네이션, 배치 분석 매핑, 모바일 디자인 토큰 통일을 구현한다.

**Architecture:** private Supabase Storage 버킷 + signed URL API route로 이미지 접근을 인증 뒤에 숨긴다. 모바일은 캡처 저장 시 Storage에 업로드해 웹과 이미지 공유를 가능하게 한다. 공유 쿼리 함수에 cursor-based pagination을 추가하고 양쪽 앱에서 "더 보기" UI를 구현한다.

**Tech Stack:** Next.js 15 API routes, Supabase JS SDK (`createSignedUrl`), Expo FileSystem (`uploadAsync`), vitest (shared 테스트), TypeScript strict

---

## File Map

### 새로 생성
- `supabase/migrations/007_private_storage.sql` — 버킷 private 전환 + 정책 교체
- `apps/web/src/app/api/image/route.ts` — signed URL 발급 API route
- `packages/shared/src/utils/storage.ts` — `extractStoragePath()` 유틸
- `packages/shared/src/__tests__/storage.test.ts` — storage 유틸 테스트

### 수정
- `packages/shared/src/types/capture.ts` — `AnalysisResult.sourceIndices` 추가
- `packages/shared/src/ai/prompts.ts` — `BATCH_ANALYSIS_INSTRUCTION`에 sourceIndices 요구
- `packages/shared/src/ai/parse-result.ts` — `parseSingleResult`에서 sourceIndices 파싱
- `packages/shared/src/__tests__/parse-result.test.ts` — 배치 테스트 추가
- `packages/shared/src/supabase/queries.ts` — cursor pagination + `getSignedUrl()`
- `packages/shared/src/index.ts` — 새 유틸 export
- `apps/web/src/app/api/upload/route.ts` — `{ url }` → `{ path }` 반환
- `apps/web/src/components/captures/CaptureCard.tsx` — `/api/image?path=...` 사용
- `apps/web/src/contexts/CapturesContext.tsx` — pagination 상태 + loadMore
- `apps/web/src/components/captures/CaptureList.tsx` — "더 보기" 버튼
- `apps/mobile/constants/Colors.ts` — primary `#F4845F`, primaryLight `#F69E80`
- `apps/mobile/app/login.tsx` — 하드코딩 색상 → Colors 참조
- `apps/mobile/app/_layout.tsx` — 하드코딩 색상 → Colors 참조
- `apps/mobile/components/MigrationModal.tsx` — 하드코딩 색상 → Colors 참조
- `apps/mobile/services/supabase.ts` — `uploadImageToStorage()` 추가
- `apps/mobile/contexts/CapturesContext.tsx` — 저장 전 Storage 업로드 + pagination

---

## Task 1: F4 — Batch Analysis sourceIndices

**배경:** 배치 분석 시 AI가 관련 이미지를 하나로 합치면, 결과 배열과 입력 이미지의 인덱스 매핑이 깨진다. AI에게 `sourceIndices` 필드를 요구해 어느 이미지들이 합쳐졌는지 추적한다.

**Files:**
- Modify: `packages/shared/src/types/capture.ts`
- Modify: `packages/shared/src/ai/prompts.ts`
- Modify: `packages/shared/src/ai/parse-result.ts`
- Modify: `packages/shared/src/__tests__/parse-result.test.ts`
- Modify: `apps/web/src/components/upload/BatchAnalyzeModal.tsx`

- [ ] **Step 1.1: AnalysisResult에 sourceIndices 타입 추가**

`packages/shared/src/types/capture.ts`에서 `AnalysisResult` 인터페이스를 수정:

```typescript
export interface AnalysisResult {
  category: CaptureCategory;
  title: string;
  summary: string;
  places: PlaceInfo[];
  extractedText: string;
  links: string[];
  tags: string[];
  source: SourceApp;
  confidence: number;
  sourceAccountId: string | null;
  keyInsights?: string[];
  relatedSearchTerms?: string[];
  sourceIndices?: number[];  // 배치 분석: 이 결과가 어떤 이미지 인덱스들에서 왔는지
}
```

- [ ] **Step 1.2: BATCH_ANALYSIS_INSTRUCTION 프롬프트 수정**

`packages/shared/src/ai/prompts.ts`에서 `BATCH_ANALYSIS_INSTRUCTION` 상수 끝 부분을 수정:

```typescript
export const BATCH_ANALYSIS_INSTRUCTION = `You are receiving MULTIPLE screenshots uploaded together.
First, determine whether the images are from the SAME content or DIFFERENT content.

SAME content examples: sequential screenshots of one Threads post (1/17, 2/17...), a long blog post captured in parts, multiple pages of the same article, overlapping screenshots of the same page.
DIFFERENT content examples: a restaurant screenshot + an article screenshot, unrelated posts from different accounts, a recipe + a travel spot.

## If ALL images are from the SAME content:
Return a SINGLE JSON object (same format as single-image analysis) with an added field:
- "sourceIndices": [0, 1, 2, ...] — array of all input image indices (0-based) that were merged

Combine all text into one coherent extractedText (remove duplicated text from overlapping screenshots)
Create ONE unified title and summary covering the entire content.
If it's a thread with page indicators (1/17, 2/17...), note the total in summary.
Merge places and links (deduplicate).
confidence reflects how well you understood the COMBINED content.

## If images are from DIFFERENT content:
Return a JSON array of objects, each in the same format as single-image analysis, each with:
- "sourceIndices": [n] — array containing the single input image index (0-based) this result came from

Each object represents one distinct piece of content.

## If SOME images are related and others are not:
Group the related ones into one merged object (sourceIndices: [0, 2] etc.), keep unrelated ones as separate objects (sourceIndices: [1] etc.). Return a JSON array.

IMPORTANT: For a single merged result, return a plain JSON object {}. For multiple results, return a JSON array []. The response format indicates whether merging happened. ALWAYS include "sourceIndices" in every result object.`;
```

- [ ] **Step 1.3: 실패하는 테스트 작성**

`packages/shared/src/__tests__/parse-result.test.ts`에 추가:

```typescript
describe('parseBatchAnalysisResult with sourceIndices', () => {
  it('parses merged result with sourceIndices', () => {
    const merged = JSON.stringify({
      category: 'text',
      title: '합쳐진 글',
      summary: '스레드 게시글',
      places: [],
      extractedText: '전체 내용',
      links: [],
      tags: ['스레드'],
      source: 'threads',
      confidence: 0.9,
      sourceAccountId: null,
      sourceIndices: [0, 1, 2],
    });

    const results = parseBatchAnalysisResult(merged);
    expect(results).toHaveLength(1);
    expect(results[0].sourceIndices).toEqual([0, 1, 2]);
  });

  it('parses array with sourceIndices per item', () => {
    const arr = JSON.stringify([
      {
        category: 'place', title: '카페', summary: '카페 정보',
        places: [{ name: '블루보틀' }], extractedText: '', links: [], tags: [],
        source: 'instagram', confidence: 0.8, sourceAccountId: null, sourceIndices: [0],
      },
      {
        category: 'text', title: '기사', summary: '뉴스 기사',
        places: [], extractedText: '기사 내용', links: [], tags: [],
        source: 'other', confidence: 0.7, sourceAccountId: null, sourceIndices: [1],
      },
    ]);

    const results = parseBatchAnalysisResult(arr);
    expect(results).toHaveLength(2);
    expect(results[0].sourceIndices).toEqual([0]);
    expect(results[1].sourceIndices).toEqual([1]);
  });

  it('returns undefined sourceIndices when field is absent (backward compat)', () => {
    const legacy = JSON.stringify({
      category: 'text', title: '레거시', summary: '',
      places: [], extractedText: '', links: [], tags: [],
      source: 'other', confidence: 0.5, sourceAccountId: null,
    });
    const results = parseBatchAnalysisResult(legacy);
    expect(results[0].sourceIndices).toBeUndefined();
  });
});
```

- [ ] **Step 1.4: 테스트 실패 확인**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|sourceIndices"
```

Expected: `parseBatchAnalysisResult with sourceIndices` 테스트들이 FAIL

- [ ] **Step 1.5: parseSingleResult에 sourceIndices 파싱 추가**

`packages/shared/src/ai/parse-result.ts`의 `parseSingleResult` 함수에서 return 객체 마지막 부분:

```typescript
function parseSingleResult(result: Record<string, unknown>): AnalysisResult {
  // ... 기존 코드 유지 ...

  return {
    category: result.category === 'place' ? 'place' : 'text',
    title: (result.title as string) || '제목 없음',
    summary: (result.summary as string) || '',
    places,
    extractedText: (result.extractedText as string) || '',
    links: Array.isArray(result.links) ? result.links : [],
    tags: Array.isArray(result.tags) ? result.tags : [],
    source: validateSource(result.source),
    confidence,
    sourceAccountId: typeof result.sourceAccountId === 'string' ? result.sourceAccountId : null,
    ...(Array.isArray(result.keyInsights) && { keyInsights: result.keyInsights as string[] }),
    ...(Array.isArray(result.relatedSearchTerms) && { relatedSearchTerms: result.relatedSearchTerms as string[] }),
    ...(Array.isArray(result.sourceIndices) && {
      sourceIndices: (result.sourceIndices as unknown[])
        .filter((v): v is number => typeof v === 'number')
    }),
  };
}
```

- [ ] **Step 1.6: 테스트 통과 확인**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|sourceIndices"
```

Expected: 3개 테스트 모두 PASS

- [ ] **Step 1.7: BatchAnalyzeModal에서 sourceIndices 기반 매핑 적용**

`apps/web/src/components/upload/BatchAnalyzeModal.tsx`에서 `imageUrls` 계산 로직 수정.
현재 `onSave(results, imageUrls)` 호출 전 imageUrls 배열이 결과 인덱스 순서로 맞지 않을 수 있음.

`runBatchAnalysis` 함수 내에서 분석 완료 후:

```typescript
// 기존: setResults(analysisResults);
// 수정: sourceIndices 기반으로 imageUrls 재배열

const reorderedImageUrls = analysisResults.map((result) => {
  // 결과에 sourceIndices가 있으면 첫 번째 인덱스의 이미지 URL 사용
  const primaryIndex = result.sourceIndices?.[0] ?? 0;
  return uploadedUrls[primaryIndex] ?? uploadedUrls[0];
});

setResults(analysisResults);
setImageUrls(reorderedImageUrls);
setExpandedIdx(0);
setStatus('done');
```

- [ ] **Step 1.8: 공유 패키지 빌드 확인**

```bash
cd packages/shared && npm run build 2>&1 | tail -5
```

Expected: `Build success` (또는 오류 없이 완료)

- [ ] **Step 1.9: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add packages/shared/src/types/capture.ts packages/shared/src/ai/prompts.ts packages/shared/src/ai/parse-result.ts packages/shared/src/__tests__/parse-result.test.ts apps/web/src/components/upload/BatchAnalyzeModal.tsx
git commit -m "feat: add sourceIndices to batch analysis for correct image-result mapping"
```

---

## Task 2: D1+D2+D4 — 모바일 컬러 하드코딩 제거 + Primary 통일

**배경:** 모바일 로그인/로딩/마이그레이션 화면이 `#050508`, `#F4845F`, `#FFB800` 등을 직접 사용하고 있어 DESIGN.md의 Colors 토큰 시스템과 불일치한다. Primary를 웹과 동일한 `#F4845F` (Warm Coral)로 통일한다.

**Files:**
- Modify: `apps/mobile/constants/Colors.ts`
- Modify: `apps/mobile/app/login.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/components/MigrationModal.tsx`

- [ ] **Step 2.1: Colors.ts — primary #F4845F로 통일**

`apps/mobile/constants/Colors.ts`에서 dark 테마 primary 값들 수정:

```typescript
dark: {
  // ... 기존 코드 ...
  primary: '#F4845F',      // Warm Coral (DESIGN.md 기준)
  primaryLight: '#F69E80', // hover/light 상태
  primaryDark: '#D4623D',  // 눌림/dark 상태

  // Tab bar
  tabBar: '#000000',
  tabIconDefault: '#666666',
  tabIconSelected: '#F4845F',  // primary와 맞춤

  // Gradient
  gradientStart: '#F4845F',
  gradientEnd: '#A78BFA',  // AI-accent와 그라데이션
  // ...
```

- [ ] **Step 2.2: _layout.tsx — ScraveDarkTheme과 로딩 뷰 수정**

`apps/mobile/app/_layout.tsx`에서 두 곳을 수정:

```typescript
// 1. ScraveDarkTheme (상단 선언부)
const ScraveDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
    text: '#FFFFFF',
    border: '#262626',
    primary: '#F4845F',  // #FFB800 → #F4845F
  },
};

// 2. 로딩 뷰 (RootLayoutNav 내부)
// 파일 상단에 import 추가:
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';

// isLoading return 블록:
if (isLoading) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
```

> **주의:** React hooks 규칙상 `useColorScheme()`은 컴포넌트 최상위에서 호출해야 한다. `RootLayoutNav` 함수 내 최상위로 이동:

```typescript
function RootLayoutNav() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { /* ... */ }, [session, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'light' ? DefaultTheme : ScraveDarkTheme}>
      {/* ... */}
    </ThemeProvider>
  );
}
```

- [ ] **Step 2.3: login.tsx — StyleSheet 하드코딩 제거**

`apps/mobile/app/login.tsx`에서 `useColorScheme`과 Colors를 추가하고 StyleSheet를 동적으로 변경:

```typescript
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function LoginScreen() {
  const { signInWithGoogle, devSkipLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>Scrave</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>AI 캡처 오거나이저</Text>

        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: colors.text }]}
          onPress={handleGoogle}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.googleButtonText, { color: colors.background }]}>Google로 시작하기</Text>
          )}
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devSkipButton, { borderColor: colors.border }]}
            onPress={devSkipLogin}
            activeOpacity={0.8}
          >
            <Text style={[styles.devSkipText, { color: colors.textTertiary }]}>[DEV] 로그인 건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  googleButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  devSkipButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  devSkipText: {
    fontSize: 13,
  },
});
```

- [ ] **Step 2.4: MigrationModal.tsx — 하드코딩 색상 교체**

`apps/mobile/components/MigrationModal.tsx`의 StyleSheet에서 하드코딩된 색상을 제거하고 props로 colors를 받거나 hook을 사용:

파일 상단에 추가:
```typescript
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
```

컴포넌트 내부 시작 부분에 추가:
```typescript
export function MigrationModal({ visible, userId, localCount, onComplete, onSkip }: Props) {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: localCount });
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  // ... 나머지 기존 코드
```

StyleSheet 정적 정의 → 동적으로 변경 (StyleSheet 대신 인라인 사용):

```typescript
// card: 기존 backgroundColor: '#0D0D12' → colors.surface
// card borderColor: '#1F1F28' → colors.border
// migrateButton: backgroundColor: '#F4845F' → colors.primary
// migrateText: color: '#000000' → colors.background
// skipButton borderColor: '#1F1F28' → colors.border

// View card 스타일 인라인으로:
<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

// migrateButton:
<TouchableOpacity style={[styles.migrateButton, { backgroundColor: colors.primary }]}>
  <Text style={[styles.migrateText, { color: colors.background }]}>마이그레이션</Text>
</TouchableOpacity>

// skipButton:
<TouchableOpacity style={[styles.skipButton, { borderColor: colors.border }]}>
  <Text style={[styles.skipText, { color: colors.textSecondary }]}>건너뛰기</Text>
</TouchableOpacity>
```

- [ ] **Step 2.5: TypeScript 타입 체크**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음 (또는 기존 오류만, 새 오류 없음)

- [ ] **Step 2.6: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/mobile/constants/Colors.ts apps/mobile/app/login.tsx apps/mobile/app/_layout.tsx apps/mobile/components/MigrationModal.tsx
git commit -m "feat: unify mobile primary color to #F4845F and remove hardcoded colors"
```

---

## Task 3: F1 — 스토리지 프라이버시 (private 버킷 + signed URL)

**배경:** `captures` 버킷이 public이라 이미지 URL을 아는 누구나 접근 가능. private으로 전환하고, 웹 API route를 통해 인증된 사용자에게만 signed URL을 발급한다.

**Files:**
- Create: `supabase/migrations/007_private_storage.sql`
- Create: `packages/shared/src/utils/storage.ts`
- Create: `packages/shared/src/__tests__/storage.test.ts`
- Create: `apps/web/src/app/api/image/route.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/app/api/upload/route.ts`
- Modify: `apps/web/src/components/captures/CaptureCard.tsx`

- [ ] **Step 3.1: storage 유틸 테스트 작성**

새 파일 `packages/shared/src/__tests__/storage.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractStoragePath } from '../utils/storage';

describe('extractStoragePath', () => {
  it('returns path as-is when already a path (not URL)', () => {
    const path = 'abc123/1234567890_abc123.jpg';
    expect(extractStoragePath(path)).toBe('abc123/1234567890_abc123.jpg');
  });

  it('extracts path from Supabase public URL', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/captures/user-id/1234_abc.jpg';
    expect(extractStoragePath(url)).toBe('user-id/1234_abc.jpg');
  });

  it('handles signed URL format', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/sign/captures/user-id/1234_abc.jpg?token=xxx';
    expect(extractStoragePath(url)).toBe('user-id/1234_abc.jpg');
  });

  it('returns empty string for empty input', () => {
    expect(extractStoragePath('')).toBe('');
  });

  it('does not modify data URIs', () => {
    const dataUri = 'data:image/jpeg;base64,/9j/4AAQ...';
    expect(extractStoragePath(dataUri)).toBe(dataUri);
  });
});
```

- [ ] **Step 3.2: 테스트 실패 확인**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -E "extractStoragePath|Cannot find"
```

Expected: 모듈을 못 찾아 FAIL

- [ ] **Step 3.3: storage 유틸 구현**

새 파일 `packages/shared/src/utils/storage.ts`:

```typescript
const SUPABASE_STORAGE_PREFIXES = [
  '/storage/v1/object/public/captures/',
  '/storage/v1/object/sign/captures/',
];

/**
 * Supabase Storage 전체 URL 또는 이미 path인 경우 모두 처리해서
 * `user_id/filename.jpg` 형식의 path를 반환한다.
 * data URI는 그대로 반환한다.
 */
export function extractStoragePath(urlOrPath: string): string {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('data:')) return urlOrPath;
  if (!urlOrPath.startsWith('http')) return urlOrPath;

  for (const prefix of SUPABASE_STORAGE_PREFIXES) {
    const idx = urlOrPath.indexOf(prefix);
    if (idx !== -1) {
      const afterPrefix = urlOrPath.slice(idx + prefix.length);
      // 쿼리 파라미터 제거 (signed URL의 ?token=... 등)
      return afterPrefix.split('?')[0];
    }
  }

  // 알 수 없는 URL — 그대로 반환
  return urlOrPath;
}
```

- [ ] **Step 3.4: 테스트 통과 확인**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -E "extractStoragePath|PASS|FAIL"
```

Expected: 5개 테스트 PASS

- [ ] **Step 3.5: shared index.ts에 storage 유틸 export 추가**

`packages/shared/src/index.ts`에서 다른 utils export 옆에 추가:

```typescript
export { extractStoragePath } from './utils/storage';
```

- [ ] **Step 3.6: Supabase 마이그레이션 작성**

새 파일 `supabase/migrations/007_private_storage.sql`:

```sql
-- Migration 007: Make captures bucket private + update storage policies

-- 1. Private 버킷으로 전환 (신규 업로드는 즉시 적용, 기존 URL은 만료됨)
UPDATE storage.buckets
SET public = false
WHERE id = 'captures';

-- 2. 기존 public read 정책 제거
DROP POLICY IF EXISTS "Anyone can view captures" ON storage.objects;

-- 3. 인증된 사용자가 본인 파일만 읽을 수 있는 정책 추가
--    (migration 006에서 upload/delete 정책은 이미 user-scoped로 설정됨)
CREATE POLICY "Users can read own captures"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'captures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 3.7: 마이그레이션 적용**

```bash
supabase db push
```

Expected: `Applied 1 migration` 출력. 실패 시 Supabase dashboard에서 직접 SQL 실행.

- [ ] **Step 3.8: upload route — path만 반환하도록 수정**

`apps/web/src/app/api/upload/route.ts`에서 마지막 return 수정:

```typescript
// 기존:
const { data: { publicUrl } } = supabase.storage
  .from('captures')
  .getPublicUrl(fileName);
return NextResponse.json({ url: publicUrl });

// 수정:
return NextResponse.json({ path: fileName });
// path 형식: 'user_id/timestamp_random.jpg'
```

- [ ] **Step 3.9: signed URL API route 생성**

새 파일 `apps/web/src/app/api/image/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStoragePath } from '@scrave/shared';

const SIGNED_URL_EXPIRY = 3600; // 1시간 (초)

export async function GET(request: NextRequest) {
  try {
    const pathParam = request.nextUrl.searchParams.get('path');
    if (!pathParam) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 전체 URL이 들어올 경우 path 추출 (구 데이터 하위호환)
    const storagePath = extractStoragePath(pathParam);

    const { data, error } = await supabase.storage
      .from('captures')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      console.error('[image-route] Signed URL error:', error);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // signed URL로 redirect (브라우저가 직접 Supabase Storage에서 이미지 로드)
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error('[image-route] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3.10: CaptureCard에서 이미지 src를 /api/image 경유로 변경**

`apps/web/src/components/captures/CaptureCard.tsx`에서 이미지 렌더링 부분:

파일 상단에 import 추가:
```typescript
import { extractStoragePath } from '@scrave/shared';
```

기존 이미지 렌더링 로직 수정:
```typescript
// 기존:
{item.imageUrl && (
  <div className="...">
    {isDataUri(item.imageUrl) ? (
      <img src={item.imageUrl} alt={...} />
    ) : (
      <Image src={item.imageUrl} fill ... />
    )}
  </div>
)}

// 수정:
{item.imageUrl && (
  <div className="...">
    {isDataUri(item.imageUrl) ? (
      // 게스트 캡처: data URI 그대로 사용
      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
    ) : (
      // 인증 사용자 캡처: /api/image 경유 signed URL
      <Image
        src={`/api/image?path=${encodeURIComponent(item.imageUrl)}`}
        alt={item.title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        loading="lazy"
      />
    )}
  </div>
)}
```

> **참고:** `next.config.js`의 `images.remotePatterns`에 Supabase signed URL 도메인이 이미 등록되어 있어야 한다. 없으면 `/api/image`를 `<img>` 태그로 렌더링한다:

```typescript
// next.config.js의 images 설정에 아래 패턴 추가 (없으면):
// { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/**' }
// 없을 경우 일단 <img> 태그로 모두 처리:
<img
  src={`/api/image?path=${encodeURIComponent(item.imageUrl)}`}
  alt={item.title}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

- [ ] **Step 3.11: next.config.js 확인 및 remotePatterns 추가**

```bash
cat apps/web/next.config.js 2>/dev/null || cat apps/web/next.config.ts 2>/dev/null
```

`images.remotePatterns`에 Supabase 호스트가 없으면 추가:
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '*.supabase.co',
      pathname: '/storage/v1/**',
    },
  ],
},
```

- [ ] **Step 3.12: TypeScript 체크**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 3.13: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add supabase/migrations/007_private_storage.sql packages/shared/src/utils/storage.ts packages/shared/src/__tests__/storage.test.ts packages/shared/src/index.ts apps/web/src/app/api/upload/route.ts apps/web/src/app/api/image/route.ts apps/web/src/components/captures/CaptureCard.tsx
git commit -m "feat: private storage bucket with signed URL API route for image access"
```

---

## Task 4: F2 — 모바일 이미지 Supabase Storage 업로드

**배경:** 모바일에서 저장 시 `file://` 로컬 URI가 DB에 저장되어 웹에서 이미지가 깨짐. 캡처 저장 전에 Storage에 업로드하고 path를 저장한다.

**Files:**
- Modify: `apps/mobile/services/supabase.ts`
- Modify: `apps/mobile/contexts/CapturesContext.tsx`

**의존성:** Task 3 완료 후 진행 (private 버킷 기준)

- [ ] **Step 4.1: supabase service에 uploadImageToStorage 추가**

`apps/mobile/services/supabase.ts` 파일 끝에 추가:

```typescript
/**
 * 로컬 이미지 URI를 Supabase Storage에 업로드하고 path를 반환한다.
 * path 형식: '{userId}/{timestamp}_{random}.jpg'
 */
export async function uploadImageToStorage(
  localUri: string,
  userId: string
): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const path = `${userId}/${timestamp}_${random}.jpg`;

  const { error } = await supabase.storage
    .from('captures')
    .upload(path, {
      uri: localUri,
      type: 'image/jpeg',
      name: `${timestamp}_${random}.jpg`,
    } as unknown as File, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  return path;
}
```

- [ ] **Step 4.2: CapturesContext.tsx — saveCapture 전 Storage 업로드 추가**

`apps/mobile/contexts/CapturesContext.tsx`에서 `saveToCloud` 함수 (또는 save 로직) 수정.

파일 상단에 import 추가:
```typescript
import { uploadImageToStorage } from '@/services/supabase';
```

Supabase에 저장하는 함수에서, `imageUri`가 `file://`로 시작하면 먼저 업로드:

```typescript
// 기존의 cloud save 로직에서:
const savedCapture = await supaSave(supabase, analysisData, imageUri, userId);

// 수정:
let storagePathOrUri = imageUri;

// 로컬 파일이면 Storage에 업로드
if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
  try {
    storagePathOrUri = await uploadImageToStorage(imageUri, userId);
  } catch (uploadError) {
    console.error('[CapturesContext] Storage upload failed, using local URI:', uploadError);
    // 업로드 실패해도 로컬 URI로 저장은 계속 (모바일에서는 여전히 보임)
  }
}

const savedCapture = await supaSave(supabase, analysisData, storagePathOrUri, userId);
```

- [ ] **Step 4.3: TypeScript 체크**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 4.4: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/mobile/services/supabase.ts apps/mobile/contexts/CapturesContext.tsx
git commit -m "feat: upload mobile captures to Supabase Storage before saving"
```

---

## Task 5: F3 — Cursor-based 페이지네이션

**배경:** `getAllCaptures()`가 전체 행을 로드해 캡처가 많아지면 타임아웃 위험. cursor-based 페이지네이션으로 20개씩 로드하고 웹/모바일 모두에서 "더 보기" UI를 추가한다.

**Files:**
- Modify: `packages/shared/src/supabase/queries.ts`
- Modify: `packages/shared/src/types/capture.ts`
- Modify: `packages/shared/src/__tests__/` (타입 테스트)
- Modify: `apps/web/src/contexts/CapturesContext.tsx`
- Modify: `apps/web/src/components/captures/CaptureList.tsx`
- Modify: `apps/mobile/contexts/CapturesContext.tsx`

- [ ] **Step 5.1: PaginatedResult 타입 추가**

`packages/shared/src/types/capture.ts` 끝에 추가:

```typescript
export interface PaginatedResult {
  items: CaptureItem[];
  nextCursor: string | null;  // 마지막 아이템의 created_at ISO string. null이면 마지막 페이지
  hasMore: boolean;
}
```

- [ ] **Step 5.2: getAllCaptures에 pagination 옵션 추가**

`packages/shared/src/supabase/queries.ts`에서 `getAllCaptures` 함수 수정:

```typescript
export async function getAllCaptures(
  client: SupabaseClient,
  options?: { cursor?: string; limit?: number }
): Promise<PaginatedResult> {
  const limit = options?.limit ?? 20;

  let query = client
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1); // 1개 더 조회해서 hasMore 판단

  if (options?.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data as CaptureRow[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;

  return {
    items: items.map(mapRowToCapture),
    nextCursor,
    hasMore,
  };
}
```

- [ ] **Step 5.3: getCapturesByCategory도 동일하게 수정**

```typescript
export async function getCapturesByCategory(
  client: SupabaseClient,
  category: CaptureCategory,
  options?: { cursor?: string; limit?: number }
): Promise<PaginatedResult> {
  const limit = options?.limit ?? 20;

  let query = client
    .from('captures')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options?.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data as CaptureRow[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;

  return {
    items: items.map(mapRowToCapture),
    nextCursor,
    hasMore,
  };
}
```

- [ ] **Step 5.4: PaginatedResult를 index.ts에서 export**

`packages/shared/src/index.ts`에 추가:

```typescript
export type { PaginatedResult } from './types/capture';
```

- [ ] **Step 5.5: 공유 패키지 빌드**

```bash
cd packages/shared && npm run build 2>&1 | tail -5
```

Expected: 오류 없이 빌드 완료

- [ ] **Step 5.6: 웹 CapturesContext에 pagination 상태 추가**

`apps/web/src/contexts/CapturesContext.tsx`에서 `CapturesContextValue` 인터페이스와 provider 수정:

```typescript
interface CapturesContextValue {
  captures: CaptureItem[];
  isLoading: boolean;
  hasMore: boolean;          // 추가
  isLoadingMore: boolean;    // 추가
  loadMore: () => Promise<void>;  // 추가
  refresh: () => Promise<void>;
  deleteCapture: (id: number) => Promise<void>;
  searchCaptures: (query: string) => Promise<CaptureItem[]>;
  getCapturesByCategory: (category: CaptureCategory) => Promise<CaptureItem[]>;
  saveCapture: (result: AnalysisResult, imageUrl: string) => Promise<void>;
}
```

Provider 내부 상태 추가:
```typescript
const [captures, setCaptures] = useState<CaptureItem[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [hasMore, setHasMore] = useState(false);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const [nextCursor, setNextCursor] = useState<string | null>(null);
```

`refresh` 함수 수정:
```typescript
const refresh = useCallback(async () => {
  try {
    setIsLoading(true);
    const result = await getAllCaptures(client);
    setCaptures(result.items);
    setHasMore(result.hasMore);
    setNextCursor(result.nextCursor);
  } catch (error) {
    console.error('Failed to load captures:', error);
  } finally {
    setIsLoading(false);
  }
}, [client]);
```

`loadMore` 함수 추가:
```typescript
const loadMore = useCallback(async () => {
  if (!hasMore || isLoadingMore || !nextCursor) return;
  try {
    setIsLoadingMore(true);
    const result = await getAllCaptures(client, { cursor: nextCursor });
    setCaptures((prev) => [...prev, ...result.items]);
    setHasMore(result.hasMore);
    setNextCursor(result.nextCursor);
  } catch (error) {
    console.error('Failed to load more captures:', error);
  } finally {
    setIsLoadingMore(false);
  }
}, [client, hasMore, isLoadingMore, nextCursor]);
```

value에 추가:
```typescript
const value: CapturesContextValue = {
  captures, isLoading, hasMore, isLoadingMore, loadMore,
  refresh, deleteCapture, searchCaptures, getCapturesByCategory, saveCapture,
};
```

- [ ] **Step 5.7: CaptureList에 "더 보기" 버튼 추가**

`apps/web/src/components/captures/CaptureList.tsx`에서 `useCapturesContext`로 `hasMore`, `isLoadingMore`, `loadMore`를 받아 목록 아래에 버튼 추가:

```typescript
// 컴포넌트 Props에 optional로 추가 또는 context에서 직접 가져오기
// CaptureList가 context를 직접 사용한다면:
import { useCapturesContext } from '@/contexts/CapturesContext';

// 목록 렌더링 후 아래에:
{hasMore && (
  <div className="flex justify-center mt-6">
    <button
      onClick={loadMore}
      disabled={isLoadingMore}
      className="px-6 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm font-medium text-text-secondary hover:text-text-primary hover:border-border-light transition-colors disabled:opacity-50"
    >
      {isLoadingMore ? '불러오는 중...' : '더 보기'}
    </button>
  </div>
)}
```

> **참고:** `CaptureList`가 context를 직접 사용하지 않고 props로 items를 받는 구조라면, `hasMore`, `isLoadingMore`, `loadMore`도 props로 전달하도록 인터페이스를 확장한다.

- [ ] **Step 5.8: 모바일 CapturesContext에 pagination 추가**

`apps/mobile/contexts/CapturesContext.tsx`에서 동일한 패턴으로 `nextCursor`, `hasMore`, `loadMore` 상태 추가.

FlatList에서:
```typescript
<FlatList
  data={captures}
  // ...
  onEndReached={loadMore}
  onEndReachedThreshold={0.3}
  ListFooterComponent={
    hasMore ? (
      <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
    ) : null
  }
/>
```

- [ ] **Step 5.9: TypeScript 체크 (web + shared)**

```bash
cd packages/shared && npm run build 2>&1 | tail -3
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 5.10: 공유 패키지 테스트 통과 확인**

```bash
cd packages/shared && npm test 2>&1 | tail -10
```

Expected: 기존 테스트 전부 PASS

- [ ] **Step 5.11: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add packages/shared/src/types/capture.ts packages/shared/src/supabase/queries.ts packages/shared/src/index.ts apps/web/src/contexts/CapturesContext.tsx apps/web/src/components/captures/CaptureList.tsx apps/mobile/contexts/CapturesContext.tsx
git commit -m "feat: cursor-based pagination for captures (20 per page) with load more UI"
```

---

## Wave 1 완료 체크리스트

```
[ ] Task 1: F4 — 배치 분석 sourceIndices (커밋 완료)
[ ] Task 2: D1+D2+D4 — 모바일 컬러 통일 (커밋 완료)
[ ] Task 3: F1 — 스토리지 private + signed URL (커밋 완료, 마이그레이션 적용)
[ ] Task 4: F2 — 모바일 이미지 Storage 업로드 (커밋 완료)
[ ] Task 5: F3 — 페이지네이션 (커밋 완료)
```

성공 기준:
- `packages/shared` 테스트 전부 PASS
- 인증된 웹 사용자가 이미지를 볼 수 있음 (signed URL 경유)
- 모바일에서 저장한 캡처가 웹에서도 이미지 정상 표시
- 1000개 캡처 환경에서 첫 로드가 20개만 조회됨
- 웹/모바일 Primary 색상이 `#F4845F`로 일치
