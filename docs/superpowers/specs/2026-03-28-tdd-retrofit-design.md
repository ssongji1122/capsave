# TDD Retrofit & Process Establishment — Design Spec

**Date:** 2026-03-28
**Branch:** feat/monorepo-web
**Goal:** 미테스트 순수 함수에 TDD 적용 + API 라우트 순수 로직 추출 + TDD 프로세스 문서화

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| 기존 테스트(23개) | 유지 | 이미 동작하는 테스트 삭제는 ROI 낮음. 커버리지 0%인 함수에 집중 |
| 접근 방식 | 레이어별 점진적 (Approach B) | Tier별 커밋, 매 커밋이 동작하는 상태 유지 |
| 추출 함수 배치 | 용도별 분리 | 공통 유틸은 shared, 웹 전용은 web/lib |
| API 라우트 교체 | 추출 + 적용 동시 | 추출만 하면 dead code, 연결까지 해야 실질적 개선 |

## Tier 1: shared 미테스트 순수 함수 TDD

기존 구현이 있지만 테스트가 없는 함수들. 테스트를 먼저 작성하고 기존 코드가 통과하는지 확인. 실패하는 엣지 케이스 발견 시 코드 수정.

### 대상

| 함수 | 파일 | 역할 |
|------|------|------|
| `mapRowToCapture` | `packages/shared/src/supabase/mappers.ts` | DB snake_case row → 도메인 camelCase 객체 |
| `mapCaptureToRow` | `packages/shared/src/supabase/mappers.ts` | 역변환, 정의된 필드만 포함 |
| `safeJsonParse` | `packages/shared/src/utils/json.ts` | JSON 파싱 실패 시 fallback 반환 |
| `isUrlSafe` | `packages/shared/src/utils/url-validator.ts` | URL 스킴 화이트리스트 검증 |
| `sanitizeUrl` | `packages/shared/src/utils/url-validator.ts` | safe면 URL 반환, 아니면 null |

### 테스트 케이스

**`mapRowToCapture` (`__tests__/mappers.test.ts`)**
- 모든 필드가 있는 정상 row → 올바른 CaptureItem (snake_case → camelCase)
- nullable 필드(confidence, deleted_at, source_account_id)가 null인 경우
- places가 JSONB 배열인 경우 vs 빈 배열
- created_at → createdAt 변환 확인

**`mapCaptureToRow` (`__tests__/mappers.test.ts`)**
- 전체 필드 변환 (camelCase → snake_case)
- undefined 필드 제외 확인 (partial update용)

**`safeJsonParse` (`__tests__/json.test.ts`)**
- 정상 JSON 문자열 → 파싱된 객체
- 유효하지 않은 JSON → fallback 값 반환
- 빈 문자열 → fallback
- 중첩 객체/배열 파싱

**`isUrlSafe` / `sanitizeUrl` (`__tests__/url-validator.test.ts`)**
- http/https 허용
- javascript:, data:, tel:, mailto: 차단
- 빈 문자열, null-like 입력 처리
- 대소문자 무관 스킴 (HTTPS, Javascript)
- sanitizeUrl: safe → URL 반환, unsafe → null

### 결과물
- `packages/shared/src/__tests__/mappers.test.ts`
- `packages/shared/src/__tests__/json.test.ts`
- `packages/shared/src/__tests__/url-validator.test.ts`
- 커밋: `test: TDD Tier 1 — shared 순수 함수 테스트`

---

## Tier 2: API 라우트 순수 로직 추출 + TDD

인라인 비즈니스 로직을 순수 함수로 추출. 테스트를 먼저 작성 (RED, 함수가 없으므로 import 실패), 함수 구현 (GREEN), 라우트에서 호출로 교체 (REFACTOR).

### 2-A: 공통 유틸 → `packages/shared/src/utils/`

| 함수 | 새 파일 | 원본 | 역할 |
|------|---------|------|------|
| `extractBearerToken(header)` | `utils/auth.ts` | analyze/route.ts | `"Bearer xxx"` → `"xxx"` 또는 null |
| `getDayBoundaries(date?)` | `utils/date.ts` | cron/dau/route.ts | 날짜 → `{ start: "YYYY-MM-DD", end: "YYYY-MM-DD" }` |
| `countDistinctUsers(rows)` | `utils/analytics.ts` | cron/dau/route.ts | user_id 배열 → distinct count |

**테스트 케이스:**

**`extractBearerToken` (`__tests__/auth.test.ts`)**
- `"Bearer abc123"` → `"abc123"`
- `"bearer abc123"` (소문자) → `"abc123"`
- `"Basic xxx"` → null
- `""`, null, undefined → null
- `"Bearer "` (토큰 없음) → null

**`getDayBoundaries` (`__tests__/date.test.ts`)**
- 특정 날짜 입력 → 해당 일의 start/end
- 인자 없음 → 오늘 기준
- 월말 경계: 3/31 → end는 4/1
- 연말 경계: 12/31 → end는 다음 해 1/1

**`countDistinctUsers` (`__tests__/analytics.test.ts`)**
- 중복 user_id → distinct count
- 빈 배열 → 0
- null user_id 항목 무시

**shared 패키지 결과물:**
- `packages/shared/src/utils/auth.ts`, `date.ts`, `analytics.ts`
- 대응하는 테스트 파일 3개
- `packages/shared/src/index.ts`에 export 추가
- tsup 리빌드
- 커밋: `feat: TDD Tier 2-A — extract shared utils (auth, date, analytics)`

### 2-B: 웹 전용 → `apps/web/src/lib/`

| 함수 | 새 파일 | 원본 | 역할 |
|------|---------|------|------|
| `extractGeminiText(candidates)` | `lib/gemini.ts` | analyze/route.ts | Gemini 응답에서 텍스트 추출 |
| `validateGeocodingInput(name, address?)` | `lib/geocoding.ts` | geocode/route.ts | 입력 유효성 → `{ valid, error? }` |
| `buildGeocodingQuery(name, address?)` | `lib/geocoding.ts` | geocode/route.ts | 검색 쿼리 문자열 조합 |
| `parseGoogleGeocodeResponse(data)` | `lib/geocoding.ts` | geocode/route.ts | Google 응답 → `{ lat, lng, address }` 또는 null |
| `generateDauNotificationHtml(dau, date)` | `lib/notifications.ts` | cron/dau/route.ts | 이메일 HTML 생성 |

**선행 작업: web에 vitest 추가**
- `apps/web`에는 테스트 러너가 없으므로 vitest devDependency 추가
- `apps/web/vitest.config.ts` 생성 (tsconfig paths alias 포함)

**테스트 케이스:**

**`extractGeminiText` (`__tests__/lib/gemini.test.ts`)**
- 정상 candidates 배열 → 텍스트 추출
- 빈 candidates → null
- parts가 없는 경우 → null
- 여러 parts → 첫 번째 text part 반환

**`validateGeocodingInput` (`__tests__/lib/geocoding.test.ts`)**
- 정상 name → `{ valid: true }`
- 빈 name → `{ valid: false, error: "..." }`
- name만, address 없음 → valid

**`buildGeocodingQuery` (`__tests__/lib/geocoding.test.ts`)**
- name + address → `"name address"` 결합
- name만 → name 그대로
- 한글/특수문자 처리

**`parseGoogleGeocodeResponse` (`__tests__/lib/geocoding.test.ts`)**
- 정상 Google Geocoding API 응답 → `{ lat, lng, address }`
- results 빈 배열 → null
- geometry 누락 → null

**`generateDauNotificationHtml` (`__tests__/lib/notifications.test.ts`)**
- DAU 수치와 날짜가 HTML에 포함
- 반환값이 HTML 태그 포함

**라우트 교체:**
- `analyze/route.ts` — extractBearerToken, extractGeminiText 호출로 교체
- `geocode/route.ts` — validate/build/parse 함수 호출로 교체
- `cron/dau/route.ts` — getDayBoundaries, countDistinctUsers, generateDauNotificationHtml 호출로 교체

**결과물:**
- `apps/web/src/lib/gemini.ts`, `geocoding.ts`, `notifications.ts`
- `apps/web/src/__tests__/lib/` 테스트 파일 3개
- `apps/web/vitest.config.ts`
- 수정된 API 라우트 3개
- 커밋: `feat: TDD Tier 2-B — extract web utils + refactor API routes`

---

## Tier 3: TDD 프로세스 문서화

### CLAUDE.md 업데이트

프로젝트 루트 `CLAUDE.md`에 TDD 규칙 추가:

```markdown
## Development Process — TDD

All new features and bug fixes follow Red-Green-Refactor:

1. RED: Write failing test first
2. GREEN: Write minimal code to pass
3. REFACTOR: Clean up, keep tests green

Rules:
- No production code without a failing test
- Pure logic in testable modules (shared/src/utils/ or web/src/lib/), not inline in routes/components
- API routes call extracted pure functions
- Test files: __tests__/<module>.test.ts colocated with source
- Test runner: vitest (shared, web), jest (mobile)
```

### Memory 업데이트

feedback memory에 TDD 프로세스 적용 기록.

### 결과물
- 수정된 `CLAUDE.md`
- memory 파일 업데이트
- 커밋: `docs: TDD process guidelines in CLAUDE.md`

---

## 커밋 계획 (총 4개)

| # | 커밋 메시지 | 내용 |
|---|-----------|------|
| 1 | `test: TDD Tier 1 — shared 순수 함수 테스트` | mappers, json, url-validator 테스트 |
| 2 | `feat: TDD Tier 2-A — extract shared utils` | auth, date, analytics 추출 + 테스트 + index export |
| 3 | `feat: TDD Tier 2-B — extract web utils + refactor routes` | gemini, geocoding, notifications + vitest 설정 + 라우트 교체 |
| 4 | `docs: TDD process guidelines` | CLAUDE.md + memory |

## 범위 밖 (명시적 제외)

- React 컴포넌트/컨텍스트 테스트 (모킹 과다)
- SQL 마이그레이션 테스트 (설정 파일)
- E2E/통합 테스트 (별도 프로젝트)
- 기존 parse-result, map-linker 테스트 재작성
- PR 템플릿, 커밋 훅 등 프로세스 자동화
