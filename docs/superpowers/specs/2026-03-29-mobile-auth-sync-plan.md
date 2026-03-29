# Implementation Plan: Mobile Auth + Supabase Sync

Spec: `2026-03-29-mobile-auth-sync-design.md`

## Step 1: Dependencies & Config

**Files:**
- `apps/mobile/package.json` — add deps
- `apps/mobile/app.json` — add plugins
- `apps/mobile/.env` — create with Supabase/Google vars

**Tasks:**
1. `npm install @supabase/supabase-js expo-secure-store expo-auth-session expo-web-browser expo-crypto`
2. Add `expo-secure-store`, `expo-crypto` to app.json plugins
3. Create `.env` with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

**Verify:** `npx expo doctor` passes, app builds without error

---

## Step 2: Supabase Client

**Files:**
- `apps/mobile/services/supabase.ts` — NEW

**Tasks:**
1. Create Supabase client with expo-secure-store adapter for auth token persistence
2. Export singleton `supabase` instance

**Test:** Unit test — client creates without error, SecureStore methods called

---

## Step 3: AuthContext

**Files:**
- `apps/mobile/contexts/AuthContext.tsx` — NEW

**Tasks:**
1. Create AuthProvider with state: `session`, `user`, `isLoading`
2. On mount: `supabase.auth.getSession()` + `onAuthStateChange` listener
3. `signInWithGoogle()`: expo-auth-session → idToken → `signInWithIdToken()`
4. `signOut()`: `supabase.auth.signOut()` + clear session
5. Export `useAuth()` hook

**Test:** Mock supabase — signIn sets session, signOut clears session, loading states correct

---

## Step 4: Login Screen

**Files:**
- `apps/mobile/app/login.tsx` — NEW

**Tasks:**
1. Full-screen login UI (dark theme, Scrave branding)
2. "Google로 시작하기" button → `signInWithGoogle()`
3. Loading state during OAuth
4. Error display on failure

**Verify:** Visual check — matches design system (dark bg, coral accent)

---

## Step 5: Root Layout Auth Guard

**Files:**
- `apps/mobile/app/_layout.tsx` — MODIFY

**Tasks:**
1. Wrap tree with `<AuthProvider>`
2. Add auth check: no session → redirect to `/login`
3. Session exists → show tabs
4. Show splash/loading while checking session

**Verify:** Cold start → login screen. After login → tabs. Kill app → reopen → tabs (session persisted).

---

## Step 6: Database Cache Layer

**Files:**
- `apps/mobile/services/database.ts` — MODIFY

**Tasks:**
1. Add `replaceAllCaptures(captures: CaptureItem[])` — clear table + bulk insert
2. Add `clearAllCaptures()` — truncate table
3. Keep existing `getAllCaptures()` for cache reads
4. Keep existing `saveCapture()` for single cache insert

**Test:** replaceAll clears old data and inserts new, clearAll empties table

---

## Step 7: CapturesContext Refactor

**Files:**
- `apps/mobile/contexts/CapturesContext.tsx` — MODIFY

**Tasks:**
1. Import supabase client + shared queries (getAllCaptures, saveCapture, deleteCapture)
2. `refresh()`: Supabase fetch → `replaceAllCaptures()` cache → setState
3. Initial load: SQLite cache first → then Supabase fetch in background
4. `saveCapture()`: Supabase insert → add to SQLite cache → setState
5. `deleteCapture()`: Supabase delete → remove from SQLite cache → setState
6. Network error handling: keep cache, show error toast
7. Pull-to-refresh support via `refresh()`

**Test:**
- Save goes to Supabase first, then cache
- Refresh replaces cache with server data
- Network failure falls back to cache

---

## Step 8: Server Analyzer Auth

**Files:**
- `apps/mobile/services/analyzers/server-analyzer.ts` — MODIFY

**Tasks:**
1. Replace `getToken` callback with `supabase.auth.getSession()` → access_token
2. Always send Bearer token in Authorization header
3. Handle 401 → trigger re-auth flow

**Verify:** Upload image → analyze succeeds with auth → capture saves to Supabase

---

## Step 9: Migration Modal

**Files:**
- `apps/mobile/components/MigrationModal.tsx` — NEW

**Tasks:**
1. Check SQLite for pre-login captures on first authenticated load
2. Show modal: "기존 N개 캡처를 계정에 저장할까요?"
3. Confirm → upload each capture to Supabase (image base64 → Storage → saveCapture)
4. Progress indicator (N/M 완료)
5. Complete → clear SQLite pre-login data
6. Skip → keep local only, don't ask again (flag in SecureStore)

**Verify:** Create captures while logged out (impossible in v1 — skip if no pre-existing data)

---

## Step 10: E2E Verification

**Tasks:**
1. Fresh install → login screen appears
2. Google login → tabs with empty state
3. Upload screenshot → AI analysis → save → appears in list
4. Pull-to-refresh → data persists
5. Kill app → reopen → data loads from cache immediately, then refreshes
6. Log out → login screen, data cleared
7. Log back in → data restored from Supabase

---

## Dependency Graph

```
Step 1 (deps)
  → Step 2 (supabase client)
    → Step 3 (auth context)
      → Step 4 (login screen)
      → Step 5 (layout auth guard)
    → Step 6 (cache layer)
      → Step 7 (captures refactor)
    → Step 8 (server auth)
  → Step 9 (migration — can be parallel with 4-8)
Step 10 (E2E — after all)
```

## Estimated Effort

| Step | Effort |
|------|--------|
| 1. Dependencies & Config | 15min |
| 2. Supabase Client | 20min |
| 3. AuthContext | 45min |
| 4. Login Screen | 30min |
| 5. Layout Auth Guard | 20min |
| 6. Cache Layer | 20min |
| 7. CapturesContext Refactor | 60min |
| 8. Server Analyzer Auth | 15min |
| 9. Migration Modal | 45min |
| 10. E2E Verification | 30min |
| **Total** | **~5h** |
