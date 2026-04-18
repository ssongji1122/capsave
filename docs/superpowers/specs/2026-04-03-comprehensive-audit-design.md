# Scrave Comprehensive Audit — Design Spec

**Date**: 2026-04-03
**Status**: Draft
**Scope**: 디자인 일관성 + UX 갭 + 기능 안정성 + 분석 품질 강화

---

## 배경

Scrave는 프리런칭 단계의 개인용 스크린샷 아카이브 앱이다. 웹(Next.js 15)과 모바일(Expo RN)을 Turborepo 모노레포로 운영하며, Gemini 2.5-flash로 스크린샷을 분석해 장소/텍스트를 분류한다.

프로젝트 전체를 코드 레벨에서 감사한 결과, 4개 영역에서 총 23개 개선 항목을 도출했다. [telegram-claudecode-obsidian-bot](https://github.com/Mydefinary/telegram-claudecode-obsidian-bot) 벤치마킹을 통해 분석 파이프라인 품질 강화 패턴도 반영한다.

### 실행 원칙

- **Wave 1** (기반): 데이터 안전성, 크로스 플랫폼 동작, 디자인 토큰 통일
- **Wave 2** (UX): 에러 피드백, 접근성, 아이콘 시스템
- **Wave 3** (품질): AI 분석 중복 판정, 정보 완성도, 폴백 체인

---

## Wave 1: 기능 안정성 + 디자인 기반

### F1. 스토리지 프라이버시 — private 버킷 + signed URL

**현재**: `captures` 버킷이 `public = true`. 이미지 URL을 아는 누구나 접근 가능.

**수정**:
1. Supabase 마이그레이션: `UPDATE storage.buckets SET public = false WHERE id = 'captures'`
2. 이미지 로드 시 서버에서 signed URL 발급 (만료: 1시간)
3. 웹: API route `/api/image/[captureId]` → signed URL redirect
4. 모바일: `getSignedUrl()` 호출 후 캐시

**영향 범위**:
- `apps/web/src/components/captures/CaptureCard.tsx` — 이미지 src를 signed URL로
- `apps/web/src/app/api/upload/route.ts` — public URL 반환 → path만 반환
- `packages/shared/src/supabase/queries.ts` — 이미지 URL 조회 로직 추가
- `apps/mobile/contexts/CapturesContext.tsx` — 이미지 로드 방식 변경
- 새 마이그레이션 파일

**제약**: signed URL 만료 후 재발급 필요. 클라이언트 캐시 전략 필수.

---

### F2. 모바일 이미지 URL — Supabase Storage 업로드 강제

**현재**: 모바일에서 캡처 저장 시 `file://` 로컬 URI가 DB에 저장됨. 웹에서 해당 캡처를 열면 이미지가 깨짐.

**수정**:
1. 모바일 `saveCapture()` 흐름에서 이미지를 Supabase Storage에 업로드
2. DB에는 Storage path (`captures/{user_id}/{timestamp}_{random}.jpg`)만 저장
3. 기존 `file://` URI가 있는 캡처는 마이그레이션 스크립트로 일괄 업로드

**영향 범위**:
- `apps/mobile/contexts/CapturesContext.tsx` — 저장 플로우에 업로드 단계 추가
- `apps/mobile/services/supabase.ts` — `uploadImage()` 함수
- 마이그레이션: 기존 로컬 이미지 → Storage 일괄 업로드 유틸

**의존성**: F1 완료 후 진행 (private 버킷 기준으로 구현)

---

### F3. 페이지네이션 — cursor-based, 20개씩

**현재**: `getAllCaptures()`가 `SELECT * FROM captures WHERE ... ORDER BY created_at DESC` — 전체 로드.

**수정**:
1. cursor-based pagination: `created_at < cursor` 방식
2. 페이지 크기: 20개 (설정 가능)
3. `CaptureList` 컴포넌트에 infinite scroll 또는 "더 보기" 버튼
4. `searchCaptures()`도 동일하게 cursor 적용

**인터페이스 변경**:
```typescript
// packages/shared/src/supabase/queries.ts
type PaginatedResult = {
  items: CaptureItem[];
  nextCursor: string | null;  // created_at ISO string
  hasMore: boolean;
};

function getAllCaptures(
  client: SupabaseClient,
  userId: string,
  options?: { cursor?: string; limit?: number }
): Promise<PaginatedResult>;
```

**영향 범위**:
- `packages/shared/src/supabase/queries.ts` — 모든 목록 쿼리에 cursor 파라미터
- `apps/web/src/contexts/CapturesContext.tsx` — 페이지 상태 관리
- `apps/web/src/components/captures/CaptureList.tsx` — infinite scroll UI
- `apps/mobile/contexts/CapturesContext.tsx` — FlatList onEndReached

---

### F4. 배치 분석 매핑 — sourceIndex 필드

**현재**: 배치 분석 시 AI가 관련 이미지를 합치면 결과 배열과 입력 이미지의 1:1 매칭이 깨짐.

**수정**:
1. `BATCH_ANALYSIS_INSTRUCTION` 프롬프트에 `sourceIndices: [0, 2]` 필드 요구 추가
2. `parseBatchAnalysisResult()`에서 sourceIndices 파싱
3. 클라이언트에서 결과 → 이미지 매핑 시 sourceIndices 기준으로 연결

**인터페이스 변경**:
```typescript
// packages/shared/src/types/capture.ts
interface AnalysisResult {
  // ... 기존 필드
  sourceIndices?: number[];  // 배치 분석에서 원본 이미지 인덱스
}
```

**영향 범위**:
- `packages/shared/src/ai/prompts.ts` — BATCH_ANALYSIS_INSTRUCTION 수정
- `packages/shared/src/ai/parse-result.ts` — sourceIndices 파싱 추가
- `apps/web/src/components/upload/BatchAnalyzeModal.tsx` — 매핑 로직 수정

---

### D1 + D2. 모바일 컬러 하드코딩 제거

**현재**:
- `app/login.tsx`: `backgroundColor: '#050508'`, title `color: '#F4845F'`
- `app/_layout.tsx` 로딩 뷰: 동일한 하드코딩
- `components/MigrationModal.tsx`: `#0D0D12`, `#1F1F28`, `#F4845F`

**수정**: 모든 하드코딩을 `Colors[colorScheme]` 참조로 교체.

**영향 범위**:
- `apps/mobile/app/login.tsx`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/components/MigrationModal.tsx`

---

### D4. 웹↔모바일 Primary 색상 통일

**현재**: 웹은 `#F4845F` (Warm Coral), 모바일은 `#FFB800` (Golden Amber). DESIGN.md는 `#F4845F`를 정의.

**결정**: DESIGN.md 기준 `#F4845F` (Warm Coral)로 통일.

**수정**:
1. `apps/mobile/constants/Colors.ts`의 `primary`를 `#F4845F`로 변경
2. `primaryLight`를 `#F69E80`으로 변경
3. 관련 accent 색상 조정 (탭바 active, FAB 등)

**영향 범위**:
- `apps/mobile/constants/Colors.ts`
- 탭바/FAB/버튼 등에서 primary를 참조하는 모든 컴포넌트

---

## Wave 2: UX 갭 + 아이콘 시스템

### F5. 업로드/분석 단일 플로우

**현재**: 이미지를 base64로 분석 API에 보내고, 별도로 원본을 Storage에 업로드. 두 번의 네트워크 왕복.

**수정**:
1. 먼저 Storage에 업로드 → path 획득
2. 분석 API에 Storage path 전달 → 서버에서 이미지 읽어 분석
3. 또는: 클라이언트에서 리사이즈된 base64만 분석에 보내고, 원본 업로드는 병렬 처리

**추천**: 병렬 처리 방식 (분석과 업로드 동시). 사용자 체감 속도 개선.

```
사용자: 이미지 선택
  ├─ (병렬 1) POST /api/upload → Storage path
  └─ (병렬 2) POST /api/analyze → AnalysisResult
두 완료 → saveCapture(result, storagePath)
```

**영향 범위**:
- `apps/web/src/components/upload/AnalyzeModal.tsx` — 병렬 호출
- `apps/web/src/components/upload/BatchAnalyzeModal.tsx` — 동일
- `apps/mobile/capture/analyze.tsx` — 동일

---

### F7. 에러 사용자 피드백

**현재**: Context의 catch 블록이 `console.error()`만 호출. 사용자는 실패를 알 수 없음.

**수정**:
1. 웹: toast 알림 시스템 (이미 `notifications.ts` 존재 — 활용 확대)
2. 모바일: `Alert.alert()` 또는 커스텀 toast
3. 에러 유형별 메시지:
   - 네트워크 오류: "연결을 확인해주세요"
   - 분석 실패: "분석에 실패했습니다. 다시 시도해주세요"
   - 업로드 실패: "이미지 업로드에 실패했습니다"
   - Rate limit: "오늘 무료 분석 횟수를 모두 사용했습니다 (5/5)"

**영향 범위**:
- `apps/web/src/contexts/CapturesContext.tsx` — 에러 시 toast 호출
- `apps/web/src/contexts/GuestCapturesContext.tsx` — 동일
- `apps/mobile/contexts/CapturesContext.tsx` — Alert 호출
- Rate limit 응답에 남은 횟수 포함: `{ error: '...', remaining: 0, limit: 5 }`

---

### U1 + U2 + U3. 키보드 접근성

**수정**:
1. **포커스 표시 (U1)**: `globals.css`에 글로벌 `focus-visible` 스타일 추가
   ```css
   :focus-visible {
     outline: 2px solid var(--color-primary);
     outline-offset: 2px;
   }
   ```
2. **모달 포커스 트랩 (U2)**: `useModalFocusTrap()` 커스텀 훅
3. **ESC 키 닫기 (U3)**: 모달 컴포넌트에 `useEffect` keydown 리스너

**영향 범위**:
- `apps/web/src/app/globals.css` — focus-visible 규칙
- `apps/web/src/components/upload/AnalyzeModal.tsx` — 포커스 트랩 + ESC
- `apps/web/src/components/upload/BatchAnalyzeModal.tsx` — 동일
- `apps/web/src/components/map/PlacePopup.tsx` — 동일
- 새 훅: `apps/web/src/hooks/useModalFocusTrap.ts`

---

### U4. 컬러 대비 보정

**현재**: Text-Tertiary `#5A5A65` on Surface `#0D0D12` = 약 2.8:1 (WCAG AA 4.5:1 미달)

**수정**: Text-Tertiary를 `#8A8A95`로 조정 → 약 5.2:1 (AA 충족)

**영향 범위**:
- `apps/web/src/app/globals.css` — `--color-text-tertiary` 값 변경
- DESIGN.md 업데이트

---

### U5. 검색 빈 결과 상태

**수정**: 검색어가 있고 결과가 0개일 때 전용 빈 상태 표시.

```
[SearchIcon] "{query}"에 대한 결과가 없습니다
다른 키워드로 검색해보세요
```

(D3 이후에는 lucide `Search` 아이콘 사용)

**영향 범위**:
- `apps/web/src/components/captures/CaptureList.tsx` — 검색 빈 상태 분기

---

### U6 + U7. 이미지 lazy loading + 지오코딩 피드백

- **U6**: CaptureCard의 `loading="eager"` → 첫 6개만 eager, 나머지 `loading="lazy"`
- **U7**: 지오코딩 실패 시 toast: `"{placeName}" 위치를 찾을 수 없습니다`

**영향 범위**:
- `apps/web/src/components/captures/CaptureCard.tsx`
- `apps/web/src/app/(app)/map/page.tsx`

---

### D3. 이모지 → SVG 아이콘

**현재**: 사이드바, 탭바, 빈 상태, 분석 모달에 이모지 사용 (`📸`, `🤖`, `📍`, `📝`).

**수정**:
1. 웹: `lucide-react` 설치 — `Camera`, `Bot`, `MapPin`, `FileText`, `Map`, `Settings` 등
2. 모바일: `lucide-react-native` 설치 (현재 Ionicons 사용 중 — lucide로 통일)
3. 빈 상태의 대형 이모지 → 48px SVG 아이콘 + surface-elevated 원형 배경 유지

**영향 범위**:
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/captures/CaptureList.tsx` (빈 상태)
- `apps/web/src/components/upload/AnalyzeModal.tsx` (로딩)
- `apps/mobile/app/(tabs)/_layout.tsx` (탭바)
- `apps/mobile/components/CaptureCard.tsx`
- `apps/mobile/components/CategoryScreen.tsx`

---

### D5. 폰트 로딩 최적화

**수정**:
1. `<link>` 태그에 `font-display: swap` 추가
2. 시스템 폰트 fallback 체인: `Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
3. `preconnect` 유지 (이미 설정됨)

**영향 범위**:
- `apps/web/src/app/layout.tsx` — link 태그 수정
- `apps/web/src/app/globals.css` — font-family fallback

---

## Wave 3: 분석 품질 강화

### A1. 3-way 중복 판정

**목적**: 같은 장소를 여러 번 캡처해도 정보가 축적되는 스마트 아카이브.

**플로우**:
```
사용자: 새 스크린샷 분석 완료
  ↓
서버: 기존 캡처 중 같은 카테고리의 최근 50개 요약 조회
  ↓
Gemini: 새 분석 결과 vs 기존 요약 비교
  ↓
판정:
  - "new" → 새 캡처로 저장
  - "duplicate" → "이미 저장된 장소입니다" 알림 + 기존 카드 링크
  - "supplement" → 기존 캡처에 새 정보 병합 (영업시간, 가격, 새 링크 등)
```

**인터페이스**:
```typescript
interface DedupVerdict {
  verdict: 'new' | 'duplicate' | 'supplement';
  existingCaptureId?: number;       // duplicate/supplement일 때
  supplementFields?: Partial<CaptureItem>;  // supplement일 때 병합할 필드
  reason: string;                   // 판정 근거 (UI 표시용)
}
```

**새 파일**:
- `packages/shared/src/ai/dedup.ts` — 중복 판정 프롬프트 + 파싱
- `apps/web/src/app/api/dedup/route.ts` — 중복 확인 API

**UX**: 분석 완료 후 자동 판정. supplement인 경우 "기존 카드에 정보를 추가할까요?" 확인 모달.

---

### A2. 정보 완성도 점수

**목적**: 장소 카드가 얼마나 완전한지 시각적으로 표시.

**점수 기준** (장소 카테고리):
| 필드 | 점수 |
|------|------|
| 이름 | 20 |
| 주소 | 20 |
| 좌표 (lat/lng) | 15 |
| 링크 1개 이상 | 15 |
| 설명/요약 | 15 |
| 태그 1개 이상 | 10 |
| 소스 앱 식별 | 5 |
| **합계** | **100** |

**UI**: 카드 하단에 프로그레스 바 + 백분율. 낮은 점수 카드에는 "정보 보강하기" CTA.

**구현**: 순수 함수로 추출 (AI 호출 불필요).

```typescript
// packages/shared/src/utils/completeness.ts
function calculateCompleteness(item: CaptureItem): {
  score: number;        // 0-100
  missing: string[];    // ['address', 'links']
};
```

**영향 범위**:
- 새 유틸: `packages/shared/src/utils/completeness.ts`
- `apps/web/src/components/captures/CaptureCard.tsx` — 점수 표시
- `apps/mobile/components/CaptureCard.tsx` — 동일

---

### A3. 원본 스크린샷 토글

**목적**: AI 분석 결과의 정확도를 사용자가 직접 검증할 수 있게.

**UX**: 카드 확장 시 "원본 보기" 버튼 → 원본 이미지를 분석 결과 옆에 표시.

**구현**: 이미 `imageUrl`이 저장되어 있으므로 UI만 추가.

**영향 범위**:
- `apps/web/src/components/captures/CaptureCard.tsx` — 토글 버튼 + 이미지 표시
- `apps/mobile/capture/[id].tsx` — 동일

---

### A4. 분석 폴백 체인

**목적**: Gemini Flash가 실패하거나 저품질 결과를 반환했을 때 자동 재시도.

**플로우**:
```
1차: Gemini 2.5-flash (기본 프롬프트)
  ↓ 실패 또는 confidence < 0.3
2차: Gemini 2.5-flash (OCR 특화 프롬프트 — 텍스트 추출에 집중)
  ↓ 실패
3차: 사용자에게 수동 입력 폼 제시
```

**새 프롬프트**: `OCR_FOCUSED_PROMPT` — 이미지에서 텍스트를 최대한 추출하는 데 특화.

**영향 범위**:
- `packages/shared/src/ai/prompts.ts` — OCR_FOCUSED_PROMPT 추가
- `apps/web/src/app/api/analyze/route.ts` — 폴백 로직
- `apps/web/src/components/upload/AnalyzeModal.tsx` — 3차 수동 입력 UI

---

### F6. 배치 분석 게스트 제한

**수정**: `/api/analyze-batch`에도 DB 기반 rate limit 적용. 배치 1회 = 이미지 수만큼 카운트.

**영향 범위**:
- `apps/web/src/app/api/analyze-batch/route.ts` — rate limit 체크 추가
- `packages/shared/src/utils/rate-limit.ts` — `incrementBy(count)` 지원

---

## 스코프 밖 (다음 사이클)

- 카카오톡 대화 임포트
- 분석 후 라우팅 액션 (여행 계획 추가, 친구에게 전송)
- 라이트 모드 테마
- 웹 컴포넌트 테스트 (snapshot/behavioral)
- Zod 스키마 검증 (AI 응답)

---

## 성공 기준

1. 모든 이미지가 private Storage에서 signed URL로 제공됨
2. 모바일 캡처가 웹에서 정상 표시됨
3. 1000개 캡처에서도 목록 로딩이 2초 이내
4. 웹/모바일 Primary 색상이 DESIGN.md와 일치
5. WCAG AA 컬러 대비 충족 (4.5:1+)
6. 같은 장소 재캡처 시 중복 알림 동작
7. 모든 에러에 사용자 피드백 표시
