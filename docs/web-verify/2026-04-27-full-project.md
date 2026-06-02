# Web Verify Report — scrave (전체 프로젝트)

**Date:** 2026-04-27
**Target:** (전체 프로젝트)
**Chains:** code + schema + requirements

## 요약
- ❌ CRITICAL: 2
- ⚠️ WARNING: 4
- ✅ PASS: 12
- ℹ️ INFO: 5

---

## 체인별 결과

### [code 체인]  depth: 3

| 상태 | 위치 | 내용 |
|------|------|------|
| ✅ | `CapturesContext.tsx` | anonymous auth (signInAnonymously) 구현 정상 |
| ✅ | `/api/capture/route.ts` | auth 체크 → Storage 업로드 + Gemini 분석 |
| ✅ | `/api/image/route.ts` | auth 체크 후 서명된 URL 생성 (private storage) |
| ✅ | `/api/geocode/route.ts` | 공개 API, fire-and-forget DAU 트래킹 정상 |
| ❌ | `/api/analyze-batch/route.ts:33` | 비인증 요청 rate limit 없음 |
| ⚠️ | `CapturesContext.tsx:isAuthenticated` | initAuth 비동기 완료 전 모달 오픈 시 guest 경로 진입 가능 |
| ✅ | `MapView.tsx` | naverContainerRef / googleContainerRef 분리로 크래시 수정 |
| ℹ️ | `GuestCapturesContext` | anonymous auth 도입 후 app 내에서는 사실상 dead path |

### [schema 체인]  depth: 3

| 상태 | 위치 | 내용 |
|------|------|------|
| ✅ | `AnalysisResult → CaptureRow` | saveCapture() 필드 완전 매핑 |
| ✅ | `CaptureRow → CaptureItem` | mapRowToCapture() 필드 완전 매핑 |
| ⚠️ | `CaptureItem.source: string` | AnalysisResult.source: SourceApp → 타입 widening |
| ✅ | RLS policies (migration 003~010) | user_id 기반 row 격리 정상 |
| ⚠️ | `migration 010` | hardcoded `10` — MAX_FREE_CAPTURES와 이중 관리 위험 |
| ✅ | Storage RLS (migration 008) | private bucket, 유저 폴더 격리 정상 |
| ℹ️ | `deleteCapture` | 하드 삭제 사용 (softDeleteCapture 미사용) |

### [requirements 체인]  depth: 3

| 상태 | 위치 | 내용 |
|------|------|------|
| ✅ | `shared/__tests__/queries.test.ts` | saveCapture, getAllCaptures 커버 |
| ✅ | `web/__tests__/lib/geocoding.test.ts` | geocoding 로직 커버 |
| ✅ | `web/__tests__/lib/batch-analyze.test.ts` | 배치 분석 커버 |
| ✅ | `web/__tests__/lib/batch-save-mapper.test.ts` | 저장 매퍼 커버 |
| ❌ | `CapturesContext.tsx` | anonymous auth 플로우 유닛 테스트 없음 |
| ❌ | `MapView.tsx` | provider 전환 로직 유닛 테스트 없음 |
| ⚠️ | `/api/analyze-batch/route.ts` | guest rate limit 시나리오 테스트 없음 |
| ℹ️ | `CLAUDE.md` | anonymous auth, 지도 provider 분리 미문서화 |
| ℹ️ | `docs/` | map provider 전환 관련 문서 없음 |

---

## 크리티컬 항목 상세

### ❌ 1. `/api/analyze-batch` — guest rate limit 없음

- **위치:** `apps/web/src/app/api/analyze-batch/route.ts:33`
- **문제:** `/api/analyze`는 비인증 요청에 IP 기반 일일 rate limit 적용, `/api/analyze-batch`는 이 체크가 없음. 비인증 클라이언트가 10장 × 무제한 반복 호출 가능. Gemini API 비용 및 남용 위험.
- **권장 액션:**
  ```typescript
  if (!user) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rateLimit = await checkGuestRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: '일일 체험 한도를 초과했습니다' }, { status: 429 });
    }
    await incrementGuestRateLimit(ip);
  }
  ```

### ❌ 2. `CapturesContext` — anonymous auth 미완료 시 guest 경로 진입

- **위치:** `apps/web/src/contexts/CapturesContext.tsx:47` (`isAuthenticated: userId !== null`)
- **문제:** `initAuth`가 비동기이므로 페이지 첫 로드 직후 모달을 열면 `isAuthenticated = false`. `AnalyzeModal`은 `isGuest=true`로 판단 → base64 저장 경로(Storage 미사용, user_id null) 진입. DB INSERT 시 RLS 정책(`auth.uid() = user_id`)을 충족하지 못해 저장 실패 가능.
- **권장 액션:** `isAuthenticated` 대신 `userId !== null`로 로딩 상태 명확히 분리하거나, `CapturesContext`에 `isAuthReady: boolean` 추가 후 ready 전까지 업로드 UI 비활성화.

---

## 경고 항목 상세

### ⚠️ 3. `CaptureItem.source` 타입 불일치

- **위치:** `packages/shared/src/types/capture.ts:38`
- **문제:** `AnalysisResult.source: SourceApp` (union)이 `CaptureItem.source: string`으로 widened. DB에서 불규칙한 값이 들어올 경우 컴파일 타임 감지 불가.
- **권장 액션:** `CaptureItem.source: SourceApp | string` 또는 `SourceApp`으로 통일.

### ⚠️ 4. `migration 010` — hardcoded `10`

- **위치:** `supabase/migrations/010_free_tier_insert_limit.sql:17`
- **문제:** `MAX_FREE_CAPTURES = 10`이 TS 상수와 SQL에 이중 정의. 값 변경 시 SQL 마이그레이션을 별도로 작성해야 하며, 동기화 누락 위험.
- **권장 액션:** 마이그레이션 주석에 `-- 변경 시 packages/shared/src/supabase/queries.ts MAX_FREE_CAPTURES와 동기화 필요` 추가.

---

## 권장 액션 요약 (우선순위순)

1. **[즉시]** `/api/analyze-batch` — guest rate limit 추가 (`checkGuestRateLimit` / `incrementGuestRateLimit` 패턴 재사용)
2. **[이번 스프린트]** `CapturesContext` — `isAuthReady` 상태 추가, 미완료 시 업로드 UI 비활성화
3. **[이번 스프린트]** `MapView.tsx` provider 전환 테스트 추가 (오늘 수정된 버그 회귀 방지)
4. **[이번 스프린트]** `CapturesContext` anonymous auth 플로우 테스트 추가
5. **[다음 스프린트]** `CaptureItem.source` 타입 `SourceApp`으로 통일
6. **[다음 스프린트]** `migration 010` 주석에 상수 동기화 경고 추가
