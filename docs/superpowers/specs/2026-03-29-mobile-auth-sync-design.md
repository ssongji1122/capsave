# Mobile Auth + Supabase Sync (v1)

## Goal

모바일 앱에 Google OAuth 인증을 추가하고, 데이터 저장소를 SQLite 로컬 전용에서 Supabase primary + SQLite 캐시 구조로 전환한다.

## Constraints

- Google OAuth만 (Apple/Kakao는 이후 프로바이더 추가로 대응)
- Realtime 구독 없음 — Pull-to-refresh만
- 오프라인 쓰기 큐 없음 — 네트워크 없으면 안내 메시지
- packages/shared 변경 최소화 (기존 쿼리 재사용)

## Architecture

### Auth Flow

```
앱 시작
  → AsyncStorage에서 Supabase 세션 복원
  → 세션 유효? → Home (tabs)
  → 세션 없음? → Login 화면
                    → "Google로 시작하기" 버튼
                    → expo-auth-session으로 Google OAuth
                    → idToken 획득
                    → supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
                    → 세션 저장 → Home
```

### Data Flow

```
[읽기]
  앱 시작 → SQLite 캐시에서 즉시 렌더
         → Supabase getAllCaptures() 비동기 호출
         → 응답 오면 SQLite 캐시 교체 + UI 갱신

[쓰기]
  이미지 분석 완료 → Supabase saveCapture() (네트워크 필수)
                  → 성공 시 SQLite 캐시에도 추가
                  → 실패 시 에러 안내 ("연결을 확인해주세요")

[새로고침]
  Pull-to-refresh → Supabase getAllCaptures() → SQLite 캐시 교체

[삭제]
  삭제 버튼 → Supabase deleteCapture() → SQLite 캐시에서도 제거
```

### Migration (1회)

로그인 직후, SQLite에 기존 캡처가 있으면:
1. 사용자에게 마이그레이션 안내 모달 표시
2. 확인 시 각 캡처를 Supabase에 insert (이미지는 base64 → Storage 업로드)
3. 완료 후 SQLite 로컬 데이터 정리
4. 실패 시 부분 성공 허용, 재시도 가능

## Components

### New Files

| File | Purpose |
|------|---------|
| `services/supabase.ts` | Supabase 클라이언트 생성 (expo-secure-store로 토큰 저장) |
| `contexts/AuthContext.tsx` | 세션 상태, signIn, signOut, isLoading |
| `app/login.tsx` | 로그인 화면 (Google 버튼 + 앱 브랜딩) |
| `components/MigrationModal.tsx` | SQLite→Supabase 데이터 이전 모달 |

### Modified Files

| File | Change |
|------|--------|
| `app/_layout.tsx` | AuthProvider 래핑, 세션 없으면 login으로 redirect |
| `contexts/CapturesContext.tsx` | SQLite 전용 → Supabase primary + SQLite 캐시 |
| `services/database.ts` | 캐시 전용 메서드 추가 (replaceAll, clearAll) |
| `services/analyzers/server-analyzer.ts` | getToken → supabase.auth.session().access_token |
| `app.json` | expo-auth-session, expo-secure-store 플러그인 추가 |
| `package.json` | @supabase/supabase-js, expo-auth-session, expo-secure-store, expo-web-browser 추가 |

### Unchanged

- `packages/shared` — 기존 getAllCaptures, saveCapture, deleteCapture 쿼리 그대로 사용
- Tab 화면들 (index.tsx, places.tsx, texts.tsx) — CapturesContext 인터페이스 동일
- `capture/analyze.tsx` — saveCapture 호출은 Context를 통하므로 변경 불필요

## Auth Details

### Supabase Client (Mobile)

```typescript
// services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Google OAuth (Expo)

```typescript
// expo-auth-session + Google provider
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  clientId: EXPO_PUBLIC_GOOGLE_CLIENT_ID, // Web client ID (same as Supabase)
});

// response.type === 'success' → response.params.id_token
// → supabase.auth.signInWithIdToken({ provider: 'google', token: id_token })
```

## Environment Variables (New)

```
EXPO_PUBLIC_SUPABASE_URL=https://englgseirbwekaxkejvd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_GOOGLE_CLIENT_ID=363258749392-j295dksd1lb5r6rq5t5ci532ml9dt9i4.apps.googleusercontent.com
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| 네트워크 없이 쓰기 시도 | Alert: "인터넷 연결을 확인해주세요" |
| OAuth 취소 | 로그인 화면 유지, 에러 없음 |
| 세션 만료 | 자동 refresh, 실패 시 로그인 화면 |
| 마이그레이션 실패 | 부분 성공 허용 + "N개 중 M개 이전 완료" 안내 |
| Supabase fetch 실패 | SQLite 캐시 유지, 토스트 에러 |

## Testing

- `services/supabase.ts` — 클라이언트 생성, SecureStore mock
- `contexts/AuthContext.tsx` — signIn/signOut 상태 전환
- `services/database.ts` — replaceAll, clearAll 캐시 메서드
- `contexts/CapturesContext.tsx` — Supabase 호출 → SQLite 캐시 갱신 흐름

## Out of Scope

- Apple Sign-in / Kakao 로그인
- Realtime subscription
- 오프라인 쓰기 큐
- 배치 분석, 검색, 지도뷰, 설정 페이지
- 웹 폴리싱 (이모지 교체, confidence 검증 등)
