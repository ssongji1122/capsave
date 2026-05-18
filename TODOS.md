# Scrave Improvement Plan

> 2026-05-18 갱신. 이전 TODOS.md는 절반이 stale (이미 해결된 항목 다수 포함).
> 본 문서는 전체 수동 audit + 3축 분류 (카테고리 / 구조 / 사용자 플로우) 결과.
> 목표: **10명 dogfood 사용자 안정화** → DAU gate 통과 → 정식 런칭.

## 이번 세션에 완료

| # | 영역 | 변경 |
|---|------|------|
| ✅ | Mobile perms | `RECORD_AUDIO` 권한 제거 (Play Store red flag 해소) — [app.config.ts](apps/mobile/app.config.ts) |
| ✅ | Free tier | `MAX_FREE_CAPTURES` 10 → 100 + DB RLS 동기화 — [migration 011](supabase/migrations/011_raise_free_tier_limit_to_100.sql) |
| ✅ | Cross-device 이미지 (U3) | shared `getSignedImageUrl()` helper + mobile `useSignedImage` 훅 + `CaptureCard` / `capture/[id]` 와이어업. private bucket 환경에서 모바일 이미지 정상 표시 |
| ✅ | Auth (U6) | LoginForm OAuth-only로 단순화 — 이메일 확인 마찰 제거. Supabase Dashboard에서 Email confirmations OFF 필요 (수동) |
| ✅ | 검색 (U7) | `search_user_captures` SQL RPC ([migration 012](supabase/migrations/012_search_user_captures_rpc.sql)) + shared `searchCaptures` 전환. `title/summary/extracted_text/places/tags` 전부 ILIKE 매칭. PostgREST `.or()` JSONB cast 회피. **마이그레이션 012 deploy 필요** |
| ✅ | Batch storage 고아 (U4) | `findUnusedImagePaths` + `handleBatchSave` 정리 호출 — Threads 17장 merge 시 16장 즉시 삭제 |
| ✅ | C4 Settings 검증 | 웹 fully wired (SettingsPage + UserPreferencesContext + PlacePopup). 모바일은 미연결 (gap 기록) |

빌드 상태: typecheck 3/3 통과 · shared 160/160 tests · web 59/62 tests (3 skipped, 의도)

## 외부 후속 조치 (코드 외)

| 항목 | 액션 |
|------|------|
| **Bundle ID** | Apple Developer 계정 등록 시 `com.anonymous.scrave` → 실 reverse-domain. 미등록 시 App Store 거부 |
| **Supabase Email confirmations** | LoginForm OAuth-only로 단순화되어 UI에 이메일 가입 없음. Dashboard 토글은 선택 사항 (방어적으로 OFF 권장) |
| **Migration 012 deploy** | `supabase db push` 또는 SQL Editor에서 `012_search_user_captures_rpc.sql` 실행. RPC 미존재 시 검색 전체가 깨짐 |
| **Resend API key** | `app_config` 테이블 평문 저장 → Supabase Vault 또는 Vercel env로 이동 (S3) |

## 남은 작업 — 3축 분류 + 우선순위

### P1 — dogfood 마찰 / 신뢰성

| ID | 영역 | 작업 | 추정 |
|----|------|------|------|
| **F1** | C1 Analyze | Gemini confidence 캘리브레이션 검증. 20+ 스크린샷 (선명/흐림/장소/텍스트) 수동 라벨링 → confidence 분포 측정 → 0.5 임계값 적정성 판단. 부적정 시 임계값 또는 second heuristic 도입 | 3h |
| **F2** | U2 Free wall | 100개 도달 시 UX. (1) 오래된 캡처 일괄 보관/삭제 도우미 (2) 가입 후 일수별 잔여 알림 (3) 추후 결제 hook | 4h |
| ~~F3~~ | ~~C4 Mobile Settings~~ | ✅ 완료 — 모바일 `UserPreferencesContext` + `sortByPreferredProvider` helper로 ActionSheet 정렬. Mobile-side 편집 UI는 P3에 위임 | — |
| ~~F4~~ | ~~S6 Batch 2-trip~~ | **P3 강등** — Vercel body limit 4.5MB × 10이미지 50MB 초과. 병렬 `/api/upload` (4.5MB 이하 각각) + 단일 `/api/analyze-batch` 패턴이 이미 효율적. 실 ROI 미미 | — |
| ~~F5~~ | ~~U8 Offline 충돌~~ | **재검증 후 미해결 이슈 없음** — `deleteCapture`는 Supabase 성공 시에만 SQLite 삭제. 오프라인이면 supaDelete throw → return → SQLite/state 미변경. Zombie 없음 | — |
| **F6** | Image cache TTL | mobile `useSignedImage` 캐시는 module-level Map. 앱 재시작 시 손실. dogfood (10 users × ~30 captures = 300ms cold start) 수용 가능 → P2 유지 | 1.5h |

### P2 — 품질 / 보안 / 효율

| ID | 영역 | 작업 | 추정 |
|----|------|------|------|
| **G1** | S3 Secret | Resend API key를 `app_config` → Supabase Vault. PL/pgSQL 함수 시그니처 수정 | 1.5h |
| **G2** | S5 Storage cleanup | 캡처 soft-delete 시 storage object 즉시 삭제 (`deleteCapture` hook). 추가: weekly cron이 `image_url`에 매칭 안되는 storage 오브젝트 일괄 정리 | 2.5h |
| ~~G3~~ | ~~C1 Image quality~~ | ✅ 완료 — client + server JPEG quality 0.85 → 0.92. PNG 경로는 mimeType 컨트랙트 확장 비용으로 보류 | — |
| **G4** | S11 Map geocoding | 100+ 장소 직렬 호출 → DB에 `lat`/`lng` 캐시 컬럼 추가 → 한 번 geocode 후 재사용. 또는 `Promise.all` 묶기 | 3h |
| ~~G5~~ | ~~Design 이모지~~ | ✅ 완료 — AnalyzeModal/BatchAnalyzeModal/UploadZone/MapView/SearchBar/CaptureCard/UncertainQueue/PlacePopup 8 사이트 모두 lucide-react로 교체 + aria 처리 | — |
| **G6** | E2E tests | Playwright로 핵심 플로우 3개: (1) OAuth 로그인 (2) 단일 캡처 저장→archive 표시 (3) 배치 17장 merge→1 카드 | 4h |

### P3 — 정착 후

| ID | 영역 | 작업 |
|----|------|------|
| ~~H1~~ | ~~Design a11y~~ | ✅ 이미 완료 — [globals.css:67-76](apps/web/src/app/globals.css:67) 전역 `:focus-visible` 2px outline. WCAG 2.1 AA 만족 |
| H2 | C5 Export | 캡처 CSV/JSON 내보내기 — 개인 아카이브 이동성 |
| H3 | C6 Notification | 일별/주별 회고 알림 (모바일 push), DAU 이메일 외 |
| H4 | C8 Reclassify UI | shared에 `reclassifyCapture` 있으나 UI 미노출 — 오분류 정정 |
| H5 | Search FTS | 트래픽 증가 시 `tsvector` 마이그레이션 — JSONB cast LIKE는 인덱스 못 탐 |
| H6 | Anonymous auth 정리 | `signInAnonymously` + sessionStorage 두 게스트 경로 병존 — 단일화 검토 |

## 3축 매트릭스 — 어디서 찾나

### 카테고리 (도메인)
- C1 Analyze: F1, G3
- C2 Archive 검색: ✅ U7 / H5
- C3 Map: G4
- C4 Settings: ✅ Web / F3 Mobile
- C5 Share/Export: H2
- C6 Notification: H3
- C7 Onboarding: F2 (한도 도달 UX 일부)
- C8 Reclassify: H4

### 구조 (architectural)
- S1 Bundle ID: 외부 조치
- S2 RECORD_AUDIO: ✅
- S3 Secret: G1
- S4 Guest paths: H6
- S5 Storage cleanup: G2
- S6 Batch 2-trip: F4
- S7 E2E test: G6
- S8 Image URL: ✅ (U3 fix)
- S9 Free wall: F2
- S10 Image quality: G3
- S11 Map geocoding: G4

### 사용자 플로우
- U1 게스트 → 가입 migrate: ✅ (drift 검증 통과)
- U2 한도 도달: F2
- U3 cross-device 이미지: ✅
- U4 배치 merge: ✅ (sourceIndices + orphan cleanup)
- U5 100+ 장소 지도: G4
- U6 이메일 가입: ✅ (OAuth-only)
- U7 검색: ✅
- U8 오프라인 sync: F5

## 추천 실행 순서

1. **외부 조치 (5분)**: Supabase Dashboard에서 Email confirmations OFF.
2. **P1 묶음 (Sprint 1, ~15h)**: F1 (calibration) → F2 (wall UX) → F3 (mobile settings) → F4 (batch 단일화).
3. **dogfood 10명 모집 + DAU gate 관찰**. 실 사용 데이터로 P1 우선순위 재조정.
4. **P2 묶음 (Sprint 2, ~14.5h)**: G1 (secret) → G2 (cleanup) → G6 (E2E) 우선.
5. **DAU 10+ 통과 후 P3 + 정식 런칭 준비** (Apple Developer 계정 + Bundle ID 최종).
