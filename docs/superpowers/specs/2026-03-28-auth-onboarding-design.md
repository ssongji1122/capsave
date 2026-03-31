# Auth & Onboarding Design — Try-then-Sign-up

**Date:** 2026-03-28
**Status:** Approved
**Branch:** feat/monorepo-web

## Overview

Capsave의 인증/온보딩을 "Try-then-Sign-up" 패턴으로 전환한다.
로그인 없이 최대 3개 캡처를 풀 체험(업로드→AI 분석→목록→지도)하고,
가입하면 체험 데이터가 자동 마이그레이션되어 영구 저장된다.

## 핵심 결정 사항

| 항목 | 결정 |
|------|------|
| 전략 | Try-then-Sign-up (3개 제한 풀 체험) |
| 체험 데이터 저장 | sessionStorage (탭 닫으면 정리) |
| 가입 방법 | 카카오 OAuth + Google OAuth + 이메일/비밀번호 |
| 체험→가입 전환 | 자동 마이그레이션 (sessionStorage → Supabase) |
| 첫 화면 | 업로드 히어로 랜딩 (핵심 액션이 첫 화면) |

## 1. 라우트 구조 & 미들웨어

### 라우트 맵

```
/                    → 랜딩 (비인증 허용, 업로드 히어로)
/login               → 로그인/가입 (카카오/구글/이메일)
/auth/callback       → OAuth 콜백 (기존 유지)
/(app)/dashboard     → 대시보드 (인증 필수) — 기존 page.tsx를 이동
/(app)/places        → 장소 (인증 필수)
/(app)/texts         → 텍스트 (인증 필수)
/(app)/map           → 지도 (인증 필수)
/(app)/settings      → 설정 (인증 필수)
```

**참고:** 기존 `(app)/page.tsx`는 URL `/`에 매핑되므로, 대시보드를 `(app)/dashboard/page.tsx`로 이동해야 랜딩 페이지와 충돌하지 않는다.

### 미들웨어 변경

현재: 모든 비인증 요청을 `/login`으로 리다이렉트.

변경:
- `/` (랜딩)을 비인증 허용 목록에 추가
- 인증된 사용자가 `/`에 접근하면 → `/dashboard`로 리다이렉트 (대시보드 직행)
- `/(app)/*` 경로는 기존처럼 인증 필수 유지

```typescript
// middleware.ts 변경 로직 (의사코드)
if (!user && pathname === '/') {
  // 허용 — 랜딩 페이지 (게스트 체험)
  return supabaseResponse;
}
if (user && pathname === '/') {
  // 인증 사용자 → 대시보드 직행
  return redirect('/dashboard');
}
// 기존 로직: /dashboard, /places, /texts, /map, /settings 등은 인증 필수
```

## 2. 게스트 체험 시스템

### GuestCapturesContext

sessionStorage 기반 임시 캡처 관리 Context.

```typescript
interface GuestCapturesContextValue {
  guestCaptures: CaptureItem[];
  remainingSlots: number;        // 3 - guestCaptures.length
  isGuestFull: boolean;          // remainingSlots === 0
  addGuestCapture: (result: AnalysisResult, imageBase64: string) => void;
  clearGuestCaptures: () => void;
}
```

**저장 구조:**
- sessionStorage key: `capsave_guest_captures`
- 값: `GuestCapture[]` JSON (CaptureItem + imageBase64)
- ID: 음수 사용 (-1, -2, -3) → 서버 데이터 ID와 충돌 방지
- 최대 3개 제한

### 랜딩 페이지 (`/page.tsx`)

새로운 루트 페이지. 기존 `(app)/page.tsx`와 별개.

```
┌─────────────────────────────────────────┐
│  CapSave                    [로그인]     │
│                                         │
│        스크린샷을 올려보세요               │
│     AI가 장소와 텍스트를 자동 분류합니다    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   📸 이미지를 드래그하거나        │    │
│  │      클릭하세요                  │    │
│  │                                 │    │
│  │         남은 체험: 3/3회          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [체험 캡처 목록 — GuestCapturesContext] │
│  [체험 캡처 지도 — 장소 카테고리만]       │
│                                         │
└─────────────────────────────────────────┘
```

**컴포넌트 재사용:**
- `UploadZone` — 기존 컴포넌트 그대로 사용
- `AnalyzeModal` — 기존 컴포넌트 수정 (게스트 모드에서는 저장 시 sessionStorage로)
- `CaptureList` — 기존 컴포넌트 그대로 사용 (데이터 소스만 다름)
- `MapView` — 기존 컴포넌트 그대로 사용

### 게스트 분석 플로우

1. 사용자가 이미지 드롭/선택
2. 클라이언트에서 이미지 → base64 변환
3. `/api/analyze`에 전송 (인증 헤더 없이)
4. AI 분석 결과 반환
5. 사용자가 "저장" 클릭
6. base64 이미지 + 분석 결과 → sessionStorage 저장
7. GuestCapturesContext 업데이트 → UI 반영

## 3. 로그인 페이지 개편

### OAuth 버튼 추가

```
┌─────────────────────────────┐
│        CapSave              │
│    AI 캡처 오거나이저         │
│                             │
│  [🟡 카카오로 시작하기]       │  ← #FEE500 배경, 검정 텍스트
│  [G  Google로 시작하기]      │  ← 흰 배경, 검정 텍스트
│                             │
│  ─────── 또는 ───────       │
│                             │
│  이메일 [____________]      │
│  비밀번호 [____________]    │
│  [      로그인       ]      │
│                             │
│  계정이 없으신가요? 회원가입  │
│  ← 체험하기 (게스트로 돌아가기)│
└─────────────────────────────┘
```

### 구현

```typescript
// OAuth 로그인
const handleOAuth = (provider: 'kakao' | 'google') => {
  supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};
```

### 외부 설정 (코드 외)

- Supabase Dashboard → Authentication → Providers:
  - Kakao: 앱 키 (Kakao Developers에서 발급)
  - Google: OAuth Client ID (Google Cloud Console에서 발급)
- Redirect URL: `https://<project>.supabase.co/auth/v1/callback`

## 4. 가입 유도 & 마이그레이션

### 가입 유도 트리거

1. **4번째 업로드 시도** → `SignupPromptModal` 표시
2. **자발적 가입** → 랜딩 헤더의 "로그인" 링크

### SignupPromptModal

```
┌─────────────────────────────┐
│         🎉                  │
│  캡처 3개를 분석했어요!       │
│                             │
│  가입하면:                   │
│  ✓ 무제한 캡처 저장          │
│  ✓ 어디서든 접근 (웹+모바일)  │
│  ✓ AI 자동 분류 & 검색       │
│                             │
│  [🟡 카카오로 시작하기]       │
│  [G  Google로 시작하기]      │
│  [   이메일로 가입하기   ]    │
│                             │
│       나중에 할게요          │
└─────────────────────────────┘
```

"나중에 할게요" → 모달 닫힘, 체험 데이터 유지, 추가 업로드 불가.
다시 업로드 시도 시 동일 모달 재표시.

### 마이그레이션 플로우

가입/로그인 완료 → 대시보드 진입 시:

1. `sessionStorage`에서 `capsave_guest_captures` 확인
2. 존재하면 각 캡처에 대해:
   - base64 이미지 → Supabase Storage 업로드 (`/api/upload` 또는 직접 client upload)
   - 분석 결과 → captures 테이블 INSERT (user_id 포함)
3. 모든 마이그레이션 완료 → sessionStorage 클리어
4. 대시보드에 기존 3개 캡처가 바로 표시

```typescript
// CapturesContext 또는 별도 훅에서 마이그레이션 처리
async function migrateGuestCaptures(supabase: SupabaseClient, userId: string) {
  const raw = sessionStorage.getItem('capsave_guest_captures');
  if (!raw) return;

  const guestCaptures: GuestCapture[] = JSON.parse(raw);

  for (const capture of guestCaptures) {
    // 1. base64 → blob → Supabase Storage
    const blob = base64ToBlob(capture.imageBase64);
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    await supabase.storage.from('captures').upload(path, blob);
    const { data: { publicUrl } } = supabase.storage.from('captures').getPublicUrl(path);

    // 2. captures 테이블 INSERT
    await supabase.from('captures').insert({
      user_id: userId,
      image_url: publicUrl,
      title: capture.title,
      summary: capture.summary,
      category: capture.category,
      confidence: capture.confidence,
      tags: capture.tags,
      places: capture.places,
    });
  }

  sessionStorage.removeItem('capsave_guest_captures');
}
```

## 5. API 보안 & Rate Limiting

### 변경 API

| API | 현재 | 변경 |
|-----|------|------|
| `/api/analyze` | 인증 필수 (Bearer/cookie) | 비인증 허용 + IP rate limit |
| `/api/upload` | 인증 필수 | 변경 없음 |
| `/api/geocode` | 인증 없음 | 변경 없음 |
| `/api/cron/dau` | CRON_SECRET | 변경 없음 |

### Rate Limit

- **게스트:** IP당 하루 5회 (`/api/analyze` 호출)
- **인증 사용자:** 제한 없음
- **구현:** 인메모리 `Map<string, { count: number; resetAt: number }>` (Phase 1용)
- **향후:** Upstash Redis로 교체 가능 (Vercel serverless 환경)

### `/api/analyze` 변경

```typescript
// 인증 분기
const user = await getUser(request); // cookie 또는 Bearer

if (!user) {
  // 게스트: rate limit 확인
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  incrementRateLimit(ip);
}

// 이후 분석 로직은 동일
```

## 사용자 여정 요약

```
[랜딩] → [스크린샷 드롭] → [AI 분석 ✨] → [목록/지도 체험]
                    ↑ 여기까지 로그인 없이 (최대 3개)

[가입 유도] → [카카오/구글/이메일] → [자동 마이그레이션] → [풀 대시보드 🎉]
                    ↑ 로그인 후 — 무제한 + 클라우드 동기화
```

## 파일 변경 목록

### 새 파일
- `apps/web/src/app/page.tsx` — 랜딩 페이지 (업로드 히어로)
- `apps/web/src/contexts/GuestCapturesContext.tsx` — sessionStorage 게스트 캡처 관리
- `apps/web/src/components/auth/OAuthButtons.tsx` — 카카오/구글 OAuth 버튼
- `apps/web/src/components/auth/SignupPromptModal.tsx` — 가입 유도 모달
- `apps/web/src/lib/rate-limit.ts` — IP 기반 rate limiter
- `apps/web/src/lib/migration.ts` — 게스트→인증 데이터 마이그레이션

### 수정 파일
- `apps/web/src/middleware.ts` — `/` 비인증 허용, 인증 사용자 리다이렉트
- `apps/web/src/app/login/page.tsx` — OAuth 버튼 추가, "체험하기" 링크
- `apps/web/src/app/api/analyze/route.ts` — 비인증 허용 + rate limit
- `apps/web/src/contexts/CapturesContext.tsx` — 마이그레이션 훅 호출
- `apps/web/src/app/auth/callback/route.ts` — OAuth 콜백 (기존 로직 유지, 변경 불필요)
