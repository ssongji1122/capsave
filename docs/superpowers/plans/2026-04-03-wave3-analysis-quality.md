# Wave 3: Analysis Quality Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 중복 캡처 자동 판정(3-way dedup), 정보 완성도 점수, 원본 스크린샷 토글, 분석 실패 시 폴백 체인, 배치 분석 게스트 rate limit을 구현한다.

**Architecture:** 중복 판정은 새 API route `/api/dedup`과 shared의 `dedup.ts` 프롬프트로 구현한다. 정보 완성도는 순수 함수(`calculateCompleteness`)로 추출해 AI 호출 없이 동작한다. 폴백 체인은 `/api/analyze` 내부에서 자동으로 처리한다.

**Tech Stack:** Gemini 2.5-flash, vitest, TypeScript

---

## File Map

### 새로 생성
- `packages/shared/src/ai/dedup.ts` — 3-way 중복 판정 프롬프트 + 파싱
- `packages/shared/src/__tests__/dedup.test.ts` — dedup 파싱 테스트
- `packages/shared/src/utils/completeness.ts` — 정보 완성도 점수 계산
- `packages/shared/src/__tests__/completeness.test.ts` — completeness 테스트
- `apps/web/src/app/api/dedup/route.ts` — 중복 판정 API route

### 수정
- `packages/shared/src/ai/prompts.ts` — OCR_FOCUSED_PROMPT 추가
- `packages/shared/src/index.ts` — 새 유틸 export
- `apps/web/src/app/api/analyze/route.ts` — 폴백 체인 추가
- `apps/web/src/components/upload/AnalyzeModal.tsx` — dedup 흐름 + 원본 토글 + 수동 입력 3차
- `apps/web/src/components/captures/CaptureCard.tsx` — completeness 점수 + 원본 토글
- `apps/mobile/components/CaptureCard.tsx` — completeness 점수 + 원본 토글
- `apps/mobile/capture/[id].tsx` — 원본 보기 섹션
- `apps/web/src/app/api/analyze-batch/route.ts` — 게스트 rate limit 추가

---

## Task 12: A2 — 정보 완성도 점수

**배경:** 장소 카드가 이름만 있는지, 주소/좌표/링크까지 갖췄는지를 0-100 점수로 보여준다. 순수 함수라 AI 호출이 불필요하다. 다른 기능보다 먼저 구현해 CaptureCard에 적용한다.

**Files:**
- Create: `packages/shared/src/utils/completeness.ts`
- Create: `packages/shared/src/__tests__/completeness.test.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/components/captures/CaptureCard.tsx`
- Modify: `apps/mobile/components/CaptureCard.tsx`

- [ ] **Step 12.1: completeness 테스트 작성**

새 파일 `packages/shared/src/__tests__/completeness.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateCompleteness } from '../utils/completeness';
import type { CaptureItem } from '../types/capture';

const basePlaceItem: CaptureItem = {
  id: 1, category: 'place', title: '블루보틀', summary: '커피',
  places: [{ name: '블루보틀' }], extractedText: '', links: [], tags: [],
  source: 'instagram', imageUrl: 'path/img.jpg', createdAt: '2026-04-03T00:00:00Z',
  userId: 'user1', confidence: 0.9, reclassifiedAt: null, deletedAt: null, sourceAccountId: null,
};

describe('calculateCompleteness', () => {
  it('scores 20 for place with name only', () => {
    const { score, missing } = calculateCompleteness(basePlaceItem);
    expect(score).toBe(20);
    expect(missing).toContain('address');
    expect(missing).toContain('coordinates');
    expect(missing).toContain('links');
    expect(missing).toContain('summary');
    expect(missing).toContain('tags');
    expect(missing).toContain('source');
  });

  it('scores 100 for fully complete place', () => {
    const fullItem: CaptureItem = {
      ...basePlaceItem,
      summary: '강남 블루보틀 카페',
      places: [{ name: '블루보틀', address: '서울 강남구', lat: 37.5, lng: 127.0, links: ['https://naver.com'] }],
      links: ['https://example.com'],
      tags: ['카페', '강남'],
      source: 'instagram',
    };
    const { score } = calculateCompleteness(fullItem);
    expect(score).toBe(100);
  });

  it('returns 0 for text category (not applicable)', () => {
    const textItem: CaptureItem = { ...basePlaceItem, category: 'text', places: [] };
    const { score } = calculateCompleteness(textItem);
    expect(score).toBe(0);
  });

  it('partial score: name + address = 40', () => {
    const item: CaptureItem = {
      ...basePlaceItem,
      places: [{ name: '블루보틀', address: '서울 강남구' }],
    };
    const { score } = calculateCompleteness(item);
    expect(score).toBe(40); // 이름 20 + 주소 20
  });
});
```

- [ ] **Step 12.2: 테스트 실패 확인**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -E "completeness|Cannot find"
```

Expected: 모듈을 못 찾아 FAIL

- [ ] **Step 12.3: completeness 유틸 구현**

새 파일 `packages/shared/src/utils/completeness.ts`:

```typescript
import type { CaptureItem } from '../types/capture';

interface CompletenessResult {
  score: number;      // 0-100
  missing: string[];  // 부족한 필드 이름
}

const WEIGHTS = {
  name: 20,        // places[0].name 존재
  address: 20,     // places[0].address 존재
  coordinates: 15, // places[0].lat && places[0].lng 존재
  links: 15,       // places[0].links?.length > 0 또는 top-level links
  summary: 15,     // summary 비어있지 않음
  tags: 10,        // tags.length > 0
  source: 5,       // source !== 'other'
} as const;

/**
 * 장소 카드의 정보 완성도를 0-100 점수로 반환한다.
 * text 카테고리는 해당 없음 (score: 0).
 */
export function calculateCompleteness(item: CaptureItem): CompletenessResult {
  if (item.category !== 'place') {
    return { score: 0, missing: [] };
  }

  const place = item.places[0];
  const missing: string[] = [];
  let score = 0;

  // 이름
  if (place?.name) {
    score += WEIGHTS.name;
  } else {
    missing.push('name');
  }

  // 주소
  if (place?.address) {
    score += WEIGHTS.address;
  } else {
    missing.push('address');
  }

  // 좌표
  if (place?.lat && place?.lng) {
    score += WEIGHTS.coordinates;
  } else {
    missing.push('coordinates');
  }

  // 링크 (장소별 링크 또는 상위 링크)
  const hasLinks =
    (place?.links && place.links.length > 0) ||
    item.links.length > 0;
  if (hasLinks) {
    score += WEIGHTS.links;
  } else {
    missing.push('links');
  }

  // 요약
  if (item.summary && item.summary.trim().length > 0) {
    score += WEIGHTS.summary;
  } else {
    missing.push('summary');
  }

  // 태그
  if (item.tags.length > 0) {
    score += WEIGHTS.tags;
  } else {
    missing.push('tags');
  }

  // 소스 앱 식별
  if (item.source && item.source !== 'other') {
    score += WEIGHTS.source;
  } else {
    missing.push('source');
  }

  return { score, missing };
}
```

- [ ] **Step 12.4: 테스트 통과 확인**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -E "completeness|PASS|FAIL"
```

Expected: 4개 테스트 PASS

- [ ] **Step 12.5: index.ts export 추가**

`packages/shared/src/index.ts`에 추가:

```typescript
export { calculateCompleteness } from './utils/completeness';
```

- [ ] **Step 12.6: 웹 CaptureCard에 completeness 점수 표시**

`apps/web/src/components/captures/CaptureCard.tsx`에서:

```typescript
import { calculateCompleteness } from '@scrave/shared';

// 카드 확장 상태에서 장소 카테고리일 때 점수 표시
const { score, missing } = item.category === 'place'
  ? calculateCompleteness(item)
  : { score: 0, missing: [] };

// 카드 하단 (확장 시):
{isExpanded && item.category === 'place' && (
  <div className="mt-3 pt-3 border-t border-border">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs text-text-tertiary">정보 완성도</span>
      <span className={`text-xs font-bold ${
        score >= 80 ? 'text-place-accent' :
        score >= 50 ? 'text-warning' : 'text-text-secondary'
      }`}>{score}%</span>
    </div>
    <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          score >= 80 ? 'bg-place-accent' :
          score >= 50 ? 'bg-warning' : 'bg-border-light'
        }`}
        style={{ width: `${score}%` }}
      />
    </div>
    {score < 60 && missing.length > 0 && (
      <p className="text-xs text-text-tertiary mt-1.5">
        부족: {missing.slice(0, 3).map(f => ({
          name: '이름', address: '주소', coordinates: '좌표',
          links: '링크', summary: '설명', tags: '태그', source: '소스'
        }[f] ?? f)).join(', ')}
      </p>
    )}
  </div>
)}
```

- [ ] **Step 12.7: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add packages/shared/src/utils/completeness.ts packages/shared/src/__tests__/completeness.test.ts packages/shared/src/index.ts apps/web/src/components/captures/CaptureCard.tsx
git commit -m "feat: place completeness score with progress bar in capture card"
```

---

## Task 13: A3 — 원본 스크린샷 토글

**배경:** AI 분석 결과의 정확도를 사용자가 직접 검증할 수 있게, 카드 확장 시 원본 이미지를 토글로 볼 수 있게 한다.

**Files:**
- Modify: `apps/web/src/components/captures/CaptureCard.tsx`
- Modify: `apps/mobile/app/capture/[id].tsx`

- [ ] **Step 13.1: 웹 CaptureCard에 "원본 보기" 토글**

`apps/web/src/components/captures/CaptureCard.tsx`에서 확장 상태에 토글 추가:

```typescript
const [showOriginal, setShowOriginal] = useState(false);

// 카드 확장 영역에 토글 버튼 추가:
{isExpanded && item.imageUrl && !isDataUri(item.imageUrl) && (
  <div className="mt-3">
    <button
      onClick={() => setShowOriginal(!showOriginal)}
      className="text-xs text-text-tertiary hover:text-text-secondary underline underline-offset-2 transition-colors"
    >
      {showOriginal ? '원본 숨기기' : '원본 보기'}
    </button>
    {showOriginal && (
      <div className="mt-2 rounded-xl overflow-hidden border border-border">
        <img
          src={`/api/image?path=${encodeURIComponent(item.imageUrl)}`}
          alt={`${item.title} 원본`}
          className="w-full h-auto max-h-80 object-contain bg-surface"
          loading="lazy"
        />
      </div>
    )}
  </div>
)}
```

- [ ] **Step 13.2: 모바일 capture/[id].tsx에 원본 보기 섹션**

`apps/mobile/app/capture/[id].tsx`에서 이미 상세 화면에 이미지가 보이는 경우 확인 후, 없으면 추가:

```typescript
const [showOriginal, setShowOriginal] = useState(false);

// 상세 화면 내 원본 보기 섹션:
{capture.imageUrl && !capture.imageUrl.startsWith('file://') && (
  <View style={{ marginTop: 16 }}>
    <TouchableOpacity
      onPress={() => setShowOriginal(!showOriginal)}
      style={{ paddingVertical: 8 }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 13, textDecorationLine: 'underline' }}>
        {showOriginal ? '원본 숨기기' : '원본 스크린샷 보기'}
      </Text>
    </TouchableOpacity>
    {showOriginal && (
      <Image
        source={{ uri: capture.imageUrl }}
        style={{ width: '100%', height: 300, borderRadius: 12 }}
        contentFit="contain"
        transition={200}
      />
    )}
  </View>
)}
```

- [ ] **Step 13.3: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/web/src/components/captures/CaptureCard.tsx apps/mobile/app/capture/\[id\].tsx
git commit -m "feat: original screenshot toggle in capture card and detail view"
```

---

## Task 14: A4 — 분석 폴백 체인 + OCR 특화 프롬프트

**배경:** Gemini Flash가 confidence < 0.3인 결과를 반환하면 OCR 특화 프롬프트로 재시도한다. 2차도 실패하면 사용자에게 수동 입력 폼을 제시한다.

**Files:**
- Modify: `packages/shared/src/ai/prompts.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/app/api/analyze/route.ts`
- Modify: `apps/web/src/components/upload/AnalyzeModal.tsx`

- [ ] **Step 14.1: OCR_FOCUSED_PROMPT 추가**

`packages/shared/src/ai/prompts.ts`에 추가:

```typescript
export const OCR_FOCUSED_PROMPT = `You are an OCR specialist. Extract ALL visible text from this image with maximum accuracy.
Focus on text extraction, not interpretation.

Respond with a JSON object:
{
  "category": "place" or "text",
  "title": "이미지에서 추출된 가장 중요한 텍스트 (한국어)",
  "summary": "이미지에 보이는 내용 간략 설명 (한국어)",
  "places": [],
  "extractedText": "이미지에서 읽을 수 있는 모든 텍스트를 빠짐없이 추출. 원문 그대로. 줄바꿈 유지.",
  "keyInsights": [],
  "relatedSearchTerms": [],
  "links": [],
  "tags": [],
  "source": "other",
  "confidence": 0.4,
  "sourceAccountId": null
}

Rules:
- extractedText: copy ALL text visible in image VERBATIM. Do not skip anything.
- If the image contains a location name, street address, or place → set category to "place"
- Otherwise set category to "text"
- confidence: always 0.4 (indicating OCR fallback was used)
- Respond ONLY with valid JSON. No markdown, no code fences.
- ALL output MUST be in Korean.`;
```

- [ ] **Step 14.2: shared index.ts에 OCR_FOCUSED_PROMPT export**

```typescript
export { SYSTEM_PROMPT, BATCH_ANALYSIS_INSTRUCTION, OCR_FOCUSED_PROMPT } from './ai/prompts';
```

- [ ] **Step 14.3: /api/analyze에 폴백 체인 추가**

`apps/web/src/app/api/analyze/route.ts`에서 Gemini 호출 로직을 폴백 체인으로 감싸기:

```typescript
import { SYSTEM_PROMPT, OCR_FOCUSED_PROMPT, parseAnalysisResult } from '@scrave/shared';

// 기존 callGemini 함수가 있다면 재사용, 없으면:
async function callGemini(imageBase64: string, prompt: string): Promise<string> {
  const response = await fetch(AI_MODEL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify({
      contents: [{ parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
      ]}],
    }),
  });
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// analyze route POST 핸들러 내 분석 로직:
// 1차 시도 — 기본 프롬프트
let result;
let usedFallback = false;

try {
  const text = await callGemini(imageBase64, SYSTEM_PROMPT);
  result = parseAnalysisResult(text);
} catch (firstError) {
  console.warn('[analyze] Primary analysis failed, trying OCR fallback:', firstError);
  result = null;
}

// confidence < 0.3이거나 1차 실패면 2차 시도
if (!result || result.confidence < 0.3) {
  try {
    const text = await callGemini(imageBase64, OCR_FOCUSED_PROMPT);
    result = parseAnalysisResult(text);
    usedFallback = true;
  } catch (secondError) {
    console.error('[analyze] OCR fallback also failed:', secondError);
    // 2차도 실패 → 클라이언트에게 manual 입력 요청
    return NextResponse.json(
      { error: '분석에 실패했습니다', needsManualInput: true },
      { status: 422 }
    );
  }
}

return NextResponse.json({ ...result, usedFallback });
```

- [ ] **Step 14.4: AnalyzeModal에 422 응답 → 수동 입력 폼**

`apps/web/src/components/upload/AnalyzeModal.tsx`에서 `needsManualInput` 처리:

```typescript
// 상태 추가:
const [needsManualInput, setNeedsManualInput] = useState(false);
const [manualTitle, setManualTitle] = useState('');
const [manualCategory, setManualCategory] = useState<'place' | 'text'>('place');

// fetch 응답 처리:
const data = await analyzeRes.json();
if (analyzeRes.status === 422 && data.needsManualInput) {
  setNeedsManualInput(true);
  setStatus('done'); // done 상태로 전환해서 수동 입력 UI 표시
  return;
}

// needsManualInput 상태일 때 UI:
{needsManualInput && (
  <div className="p-4">
    <p className="text-sm text-text-secondary mb-3">
      이미지를 분석하지 못했습니다. 직접 정보를 입력해주세요.
    </p>
    <select
      value={manualCategory}
      onChange={(e) => setManualCategory(e.target.value as 'place' | 'text')}
      className="w-full p-2.5 mb-3 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary"
    >
      <option value="place">📍 장소</option>
      <option value="text">📝 텍스트</option>
    </select>
    <input
      type="text"
      value={manualTitle}
      onChange={(e) => setManualTitle(e.target.value)}
      placeholder="제목을 입력하세요"
      className="w-full p-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
    />
    <button
      onClick={() => {
        if (!manualTitle.trim()) return;
        // 수동 입력으로 최소 AnalysisResult 구성
        const manualResult = {
          category: manualCategory,
          title: manualTitle,
          summary: '',
          places: [],
          extractedText: '',
          links: [],
          tags: [],
          source: 'other' as const,
          confidence: 0,
          sourceAccountId: null,
        };
        setResult(manualResult);
        setNeedsManualInput(false);
      }}
      disabled={!manualTitle.trim()}
      className="w-full mt-3 py-2.5 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-40"
    >
      저장하기
    </button>
  </div>
)}
```

- [ ] **Step 14.5: TypeScript 체크**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 14.6: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add packages/shared/src/ai/prompts.ts packages/shared/src/index.ts apps/web/src/app/api/analyze/route.ts apps/web/src/components/upload/AnalyzeModal.tsx
git commit -m "feat: analysis fallback chain — OCR retry on low confidence + manual input fallback"
```

---

## Task 15: A1 — 3-way 중복 판정

**배경:** 같은 장소를 여러 번 캡처하면 중복 카드가 쌓인다. 저장 전 기존 캡처와 비교해 new/duplicate/supplement를 판정한다.

**Files:**
- Create: `packages/shared/src/ai/dedup.ts`
- Create: `packages/shared/src/__tests__/dedup.test.ts`
- Create: `apps/web/src/app/api/dedup/route.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/components/upload/AnalyzeModal.tsx`

- [ ] **Step 15.1: dedup 파싱 테스트 작성**

새 파일 `packages/shared/src/__tests__/dedup.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseDedupVerdict } from '../ai/dedup';

describe('parseDedupVerdict', () => {
  it('parses "new" verdict', () => {
    const json = JSON.stringify({ verdict: 'new', existingCaptureId: null, supplementFields: null, reason: '새로운 장소' });
    const result = parseDedupVerdict(json);
    expect(result.verdict).toBe('new');
    expect(result.existingCaptureId).toBeNull();
  });

  it('parses "duplicate" verdict with existingCaptureId', () => {
    const json = JSON.stringify({ verdict: 'duplicate', existingCaptureId: 42, supplementFields: null, reason: '같은 카페' });
    const result = parseDedupVerdict(json);
    expect(result.verdict).toBe('duplicate');
    expect(result.existingCaptureId).toBe(42);
  });

  it('parses "supplement" verdict with supplementFields', () => {
    const json = JSON.stringify({
      verdict: 'supplement',
      existingCaptureId: 7,
      supplementFields: { summary: '영업시간 추가', tags: ['카페', '강남', '영업시간'] },
      reason: '영업시간 정보가 새로 추가됨',
    });
    const result = parseDedupVerdict(json);
    expect(result.verdict).toBe('supplement');
    expect(result.existingCaptureId).toBe(7);
    expect(result.supplementFields?.summary).toBe('영업시간 추가');
  });

  it('defaults to "new" on parse error', () => {
    const result = parseDedupVerdict('invalid json {{{');
    expect(result.verdict).toBe('new');
  });
});
```

- [ ] **Step 15.2: 테스트 실패 확인**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -E "parseDedupVerdict|Cannot find"
```

Expected: 모듈을 못 찾아 FAIL

- [ ] **Step 15.3: dedup 프롬프트 + 파싱 구현**

새 파일 `packages/shared/src/ai/dedup.ts`:

```typescript
import type { CaptureItem } from '../types/capture';

export interface DedupVerdict {
  verdict: 'new' | 'duplicate' | 'supplement';
  existingCaptureId: number | null;
  supplementFields: Partial<Pick<CaptureItem, 'summary' | 'tags' | 'links' | 'places'>> | null;
  reason: string;
}

/**
 * 새 분석 결과와 기존 캡처 목록을 비교해 중복 여부를 판정하는 프롬프트를 생성한다.
 */
export function buildDedupPrompt(
  newTitle: string,
  newSummary: string,
  newPlaces: { name: string; address?: string }[],
  existingCaptures: { id: number; title: string; summary: string; placeName?: string }[]
): string {
  const existingList = existingCaptures
    .map((c) => `[ID:${c.id}] "${c.title}" — ${c.summary}${c.placeName ? ` (장소: ${c.placeName})` : ''}`)
    .join('\n');

  return `당신은 개인 아카이브의 중복 콘텐츠 감지 시스템입니다.

새로 저장하려는 캡처:
- 제목: ${newTitle}
- 요약: ${newSummary}
- 장소: ${newPlaces.map((p) => `${p.name}${p.address ? ` (${p.address})` : ''}`).join(', ') || '없음'}

기존 저장된 캡처 목록 (최근 50개):
${existingList || '(없음)'}

다음 기준으로 판정해주세요:
- "new": 기존에 없는 완전히 새로운 장소/콘텐츠
- "duplicate": 이미 저장된 것과 동일한 장소/콘텐츠 (다른 스크린샷이지만 내용 동일)
- "supplement": 기존 캡처와 같은 장소이지만, 영업시간/가격/새 사진 등 추가 정보가 있는 경우

JSON으로만 응답하세요:
{
  "verdict": "new" | "duplicate" | "supplement",
  "existingCaptureId": null | 기존캡처ID (duplicate/supplement인 경우),
  "supplementFields": null | { "summary": "...", "tags": [...] } (supplement인 경우 추가할 필드),
  "reason": "판정 근거 한 문장"
}

JSON 외 다른 텍스트, 마크다운 없이 순수 JSON만 응답하세요.`;
}

/** Gemini 응답에서 DedupVerdict를 파싱한다. 파싱 실패 시 "new"로 안전하게 폴백한다. */
export function parseDedupVerdict(content: string): DedupVerdict {
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const verdict = ['new', 'duplicate', 'supplement'].includes(parsed.verdict)
      ? (parsed.verdict as DedupVerdict['verdict'])
      : 'new';

    return {
      verdict,
      existingCaptureId: typeof parsed.existingCaptureId === 'number' ? parsed.existingCaptureId : null,
      supplementFields: parsed.supplementFields ?? null,
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    };
  } catch {
    return { verdict: 'new', existingCaptureId: null, supplementFields: null, reason: '' };
  }
}
```

- [ ] **Step 15.4: 테스트 통과 확인**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -E "parseDedupVerdict|PASS|FAIL"
```

Expected: 4개 테스트 PASS

- [ ] **Step 15.5: shared index.ts에 export 추가**

```typescript
export { buildDedupPrompt, parseDedupVerdict } from './ai/dedup';
export type { DedupVerdict } from './ai/dedup';
```

- [ ] **Step 15.6: /api/dedup route 생성**

새 파일 `apps/web/src/app/api/dedup/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllCaptures, buildDedupPrompt, parseDedupVerdict } from '@scrave/shared';

const AI_MODEL_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, summary, places } = await request.json();
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

    // 기존 캡처 최근 50개 조회
    const { items: existing } = await getAllCaptures(supabase, { limit: 50 });
    const existingSummaries = existing.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      placeName: c.places[0]?.name,
    }));

    const prompt = buildDedupPrompt(title, summary ?? '', places ?? [], existingSummaries);

    const response = await fetch(AI_MODEL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      // dedup 실패 시 안전하게 "new"로 폴백 (저장 막지 않음)
      console.error('[dedup] Gemini error:', response.status);
      return NextResponse.json({ verdict: 'new', existingCaptureId: null, supplementFields: null, reason: '' });
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const verdict = parseDedupVerdict(text);

    return NextResponse.json(verdict);
  } catch (error) {
    console.error('[dedup] Error:', error);
    // 에러 시 "new"로 폴백 (사용자 저장을 막지 않음)
    return NextResponse.json({ verdict: 'new', existingCaptureId: null, supplementFields: null, reason: '' });
  }
}
```

- [ ] **Step 15.7: AnalyzeModal에 dedup 흐름 추가**

`apps/web/src/components/upload/AnalyzeModal.tsx`에서 분석 완료 → 저장 직전 dedup 체크:

```typescript
import type { DedupVerdict } from '@scrave/shared';

// 상태 추가:
const [dedupVerdict, setDedupVerdict] = useState<DedupVerdict | null>(null);
const [showDedupPrompt, setShowDedupPrompt] = useState(false);

// 분석 완료 후 (setResult 호출 직후):
if (analysisResult && analysisResult.category === 'place') {
  // 비동기로 dedup 체크 (저장 버튼 클릭을 막지 않음 — 결과가 오면 보여줌)
  fetch('/api/dedup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: analysisResult.title,
      summary: analysisResult.summary,
      places: analysisResult.places,
    }),
  })
    .then((r) => r.json())
    .then((verdict: DedupVerdict) => {
      if (verdict.verdict !== 'new') {
        setDedupVerdict(verdict);
        setShowDedupPrompt(true);
      }
    })
    .catch(() => {}); // dedup 실패는 무시
}

// dedup 알림 UI (result 표시 영역 위에):
{showDedupPrompt && dedupVerdict && (
  <div className="mx-4 mb-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
    <p className="text-xs font-medium text-warning mb-2">
      {dedupVerdict.verdict === 'duplicate'
        ? '⚠️ 이미 저장된 장소와 동일합니다'
        : '💡 기존 카드에 새 정보를 추가할 수 있습니다'}
    </p>
    <p className="text-xs text-text-secondary mb-3">{dedupVerdict.reason}</p>
    <div className="flex gap-2">
      {dedupVerdict.verdict === 'supplement' && (
        <button
          onClick={() => {
            // supplement: 기존 캡처 업데이트 후 닫기
            // (updateCapturePlaces 호출은 onSave 콜백을 통해 처리)
            onSave(result!, imageUrl, { merge: true, targetId: dedupVerdict.existingCaptureId! });
            onClose();
          }}
          className="flex-1 py-2 rounded-lg bg-warning text-black text-xs font-bold"
        >
          기존 카드에 추가
        </button>
      )}
      <button
        onClick={() => setShowDedupPrompt(false)}
        className="flex-1 py-2 rounded-lg bg-surface-elevated border border-border text-xs text-text-secondary"
      >
        {dedupVerdict.verdict === 'duplicate' ? '그래도 새로 저장' : '새 카드로 저장'}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 15.8: TypeScript 체크**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 15.9: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add packages/shared/src/ai/dedup.ts packages/shared/src/__tests__/dedup.test.ts packages/shared/src/index.ts apps/web/src/app/api/dedup/route.ts apps/web/src/components/upload/AnalyzeModal.tsx
git commit -m "feat: 3-way dedup detection — AI-powered duplicate/supplement judgment before save"
```

---

## Task 16: F6 — 배치 분석 게스트 Rate Limit

**배경:** `/api/analyze-batch`에 게스트 rate limit이 없어 무제한 무료 사용 가능. 배치 1회 = 이미지 수만큼 카운트한다.

**Files:**
- Modify: `apps/web/src/app/api/analyze-batch/route.ts`

- [ ] **Step 16.1: analyze-batch에 rate limit 추가**

`apps/web/src/app/api/analyze-batch/route.ts`에서 기존 `/api/analyze`의 rate limit 로직을 그대로 가져와 적용:

```typescript
// 기존 게스트 체크 로직 가져오기 (analyze/route.ts에서 패턴 참조)
// 이미지 수만큼 카운트:

if (!user) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';

  const imageCount = images.length; // 요청에서 받은 이미지 수

  const { remaining, allowed } = await checkAndIncrementRateLimit(supabase, ip, imageCount);
  if (!allowed) {
    return NextResponse.json(
      { error: '오늘 무료 분석 횟수를 모두 사용했습니다.', remaining: 0, limit: 5 },
      { status: 429 }
    );
  }
}
```

> **참고:** `checkAndIncrementRateLimit`이 단일 카운트 함수라면, `incrementBy(count)` 지원을 추가하거나 `count`번 반복 호출한다. 현재 `rate-limit.ts`의 구현을 확인 후 최소한의 수정으로 적용한다.

- [ ] **Step 16.2: TypeScript 체크**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 16.3: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/web/src/app/api/analyze-batch/route.ts
git commit -m "fix: apply guest rate limit to batch analysis (counts per image)"
```

---

## Wave 3 완료 체크리스트

```
[ ] Task 12: A2 — completeness 점수 (커밋 완료)
[ ] Task 13: A3 — 원본 스크린샷 토글 (커밋 완료)
[ ] Task 14: A4 — 폴백 체인 + OCR 프롬프트 (커밋 완료)
[ ] Task 15: A1 — 3-way dedup (커밋 완료)
[ ] Task 16: F6 — 배치 rate limit (커밋 완료)
```

성공 기준:
- 장소 카드에 completeness 점수 바가 표시됨
- 카드 확장 시 "원본 보기" 버튼이 동작함
- confidence < 0.3인 이미지를 분석 시 OCR 재시도가 발생함
- 같은 카페를 재캡처 시 중복 알림이 표시됨
- 배치 분석에서 게스트는 이미지 수만큼 rate limit 소비
