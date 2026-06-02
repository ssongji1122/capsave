# Handoff: 모바일 인증 + Supabase 싱크 & 웹 버그 수정
> Created: 2026-03-29T23:30:00+09:00
> Branch: feat/monorepo-web
> Worktree: main

## 작업 목표
모바일 앱에 Google OAuth 인증을 추가하고 SQLite 캐시 + Supabase primary 구조로 전환. 웹 앱의 로그인 연결 및 분석 버그도 수정.

## 완료된 작업

### 웹 — Google OAuth 로그인 연결
- [x] Google Cloud Console에서 OAuth 동의 화면 구성 + OAuth 클라이언트 ID "Scrave Web" 생성
- [x] Supabase 대시보드에서 Google 프로바이더 활성화 + Client ID/Secret 입력
- [x] Google Cloud Console에서 앱을 "테스트" → "프로덕션" 전환
- [x] Chrome에서 E2E 확인: 로그인 → Google 계정 선택 → 대시보드 리다이렉트 정상

### 웹 — 지도 Geocoding 연결
- [x] Google Cloud Console에서 Geocoding API 활성화 + Maps Platform API Key 발급
- [x] `.env.local`에 `GOOGLE_MAPS_API_KEY` 추가
- [x] 서버 재시작 후 geocode 200 OK 확인 (이전에는 전부 500)

### 웹 — 배치 분석 JSON 에러 수정
- [x] `analyze-batch/route.ts`: `maxOutputTokens: 4096` → `16384` (10장 분석 시 응답 잘림 방지)
- [x] `analyze/route.ts`: `maxOutputTokens: 2048` → `4096`
- [x] `parse-result.ts`: `tryParseJSON()` 추가 — stack 기반 중첩 bracket 닫기로 잘린 JSON 자동 복구
- [x] `parse-result.test.ts`: truncated JSON 복구 테스트 7개 추가 (전부 통과)

### 테스트 인프라
- [x] `packages/shared/vitest.config.ts` 생성 (shared 프로젝트 독립 실행 가능)
- [x] shared 124 tests, web 40 tests 전부 green

## 진행 중인 작업
- [ ] 모바일 인증 + 싱크 설계 완료 → 스펙 문서 작성 필요
  - 현재 상태: brainstorming 완료, 설계 합의됨
  - 다음 단계: 스펙 문서 작성 → implementation plan 생성 → 코드 구현

## 남은 작업

### 모바일 인증 + 싱크 (v1) — 설계 합의 완료
- [ ] 스펙 문서 작성 (`docs/superpowers/specs/2026-03-29-mobile-auth-sync-design.md`)
- [ ] Implementation plan 작성 (`/superpowers:writing-plans`)
- [ ] `apps/mobile/services/supabase.ts` — Supabase 클라이언트 (expo-secure-store 토큰)
- [ ] `apps/mobile/contexts/AuthContext.tsx` — 세션 관리, Google OAuth
- [ ] `apps/mobile/app/login.tsx` — 로그인 화면
- [ ] `apps/mobile/app/_layout.tsx` — AuthProvider, 세션 체크
- [ ] `apps/mobile/contexts/CapturesContext.tsx` — Supabase primary + SQLite 캐시
- [ ] `apps/mobile/services/database.ts` — 캐시 레이어로 전환
- [ ] `apps/mobile/services/analyzers/server-analyzer.ts` — Bearer 토큰 헤더

### 웹 폴리싱 (후순위)
- [ ] Kakao 로그인 연결 (Kakao Developers 로그인 필요)
- [ ] 이모지 아이콘 → lucide-react SVG 교체
- [ ] Confidence 캘리브레이션 검증
- [ ] DAU 정의 수정 (capture DAU → session DAU)
- [ ] 중복 업로드 경로 통합

### 새 기능 (C)
- [ ] 폴더/컬렉션, 공유, 내보내기 등 — 미정

### 인프라/품질 (D)
- [ ] 컴포넌트/E2E 테스트
- [ ] CI/CD 파이프라인
- [ ] .env.example 문서화

## 변경된 파일 목록 (이번 세션)
| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `apps/web/.env.local` | 수정 | GOOGLE_MAPS_API_KEY 추가 |
| `apps/web/src/app/api/analyze-batch/route.ts` | 수정 | maxOutputTokens 4096→16384, console.log 제거 |
| `apps/web/src/app/api/analyze/route.ts` | 수정 | maxOutputTokens 2048→4096 |
| `packages/shared/src/ai/parse-result.ts` | 수정 | tryParseJSON + buildClosingSequence 추가 |
| `packages/shared/src/__tests__/parse-result.test.ts` | 수정 | truncated JSON 복구 테스트 7개 추가 |
| `packages/shared/vitest.config.ts` | 신규 | shared 패키지 vitest 독립 설정 |

## 핵심 결정사항
- **모바일 인증:** Google OAuth만 v1, Apple/Kakao는 나중에 프로바이더 추가
- **데이터 구조:** Supabase primary + SQLite 읽기 캐시 (오프라인 쓰기 큐 제외)
- **Realtime:** v1에서 제외, Pull-to-refresh만 지원
- **기존 로컬 데이터:** 로그인 시 SQLite→Supabase 1회 마이그레이션
- **JSON 복구:** stack 기반 bracket 닫기 (단순 count 방식은 중첩 구조에서 실패)

## 주의사항
- Google Cloud Console 프로젝트: `avid-circle-490001-e0` (My Project 95891)
- OAuth Client ID: `363258749392-j295dksd1lb5r6rq5t5ci532ml9dt9i4.apps.googleusercontent.com`
- Maps API Key: `.env.local`에만 존재, Vercel 배포 시 env에 추가 필요
- Kakao OAuth는 Kakao Developers 계정 로그인이 필요 (이번 세션에서 미완)
- `apps/web/src/app/login/page.tsx`와 `browser.ts`는 유저가 직접 수정한 부분 있음 — 건드리지 말 것

## 재개 명령
```bash
# 새 세션에서 이 명령으로 시작
/handoff open mobile-auth-sync-2026-03-29
```
