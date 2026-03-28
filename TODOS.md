# TODOS

## Mobile map-linker migration to shared package

**What:** Migrate `apps/mobile/services/map-linker.ts` to import from `@capsave/shared` instead of local copy.

**Why:** Two separate map-linker implementations exist. Tmap has been added to the shared package, but mobile won't get it until this migration happens. One source of truth across mobile + web.

**Pros:** Single implementation, future map providers added once, no drift.

**Cons:** The shared `url-validator` currently only allows `https:` and `http:` — it must be updated to allowlist deep-link schemes (`nmap://`, `kakaomap://`, `comgooglemaps://`, `geo:`, `tmap://`) before migrating, or mobile silently falls through to web URLs instead of opening map apps.

**Context:** The local mobile map-linker uses `React Native Linking` for app deep links + web URL fallback. The shared map-linker is web-only. The migration requires extracting the `Linking` dependency as a platform adapter or keeping `openMap()` mobile-only while sharing just the URL builders.

**Depends on:** Tmap added to shared map-linker (done) + shared url-validator updated to allow mobile deep-link schemes (blocked on this task).

---

## Deduplicate upload + analyze in AnalyzeModal

**What:** `AnalyzeModal.tsx` sends the raw file twice — once to `/api/upload` (stores original) and once to `/api/analyze` (resizes + analyzes). No size cap, no content-type validation on the upload route.

**Why:** A 10MB phone screenshot is transferred and stored twice. At scale this inflates Supabase Storage costs significantly (originals never cleaned up).

**Pros of fixing:** Lower storage costs, enforced size limits (reject >10MB at upload), single file transfer per capture.

**Cons:** Medium refactor — upload route needs to return analyzed result + store resized thumbnail in one call, or analyze route needs to handle storage.

**Context:** Current flow: `UploadZone → file selected → AnalyzeModal opens → POST /api/upload (store) + POST /api/analyze (analyze separately)`. Simplest fix: merge into single `/api/upload` route that resizes, analyzes (calls Gemini), stores thumbnail, returns AnalysisResult. Delete the separate `/api/analyze` route.

**Depends on:** Nothing.

---

## Validate confidence calibration before shipping uncertain queue (P1)

**What:** Before shipping the "Review needed" uncertain queue UI, validate that Gemini 2.5-flash's prompted confidence score (0.0–1.0) is actually correlated with analysis quality. Test 20+ screenshots spanning clear place photos, blurry images, non-place content, and ambiguous text. Verify that low-confidence scores correspond to captures that genuinely need review.

**Why:** Gemini doesn't natively return a calibrated confidence signal — it's responding to a prompt asking for a float. If the scores are uncalibrated, the 0.5 threshold could be meaningless (e.g., Gemini always returns 0.8+, or returns random values in range). Shipping the uncertain queue with a broken signal means users see a "Review needed" section full of perfectly good captures, or never see it at all.

**Pros:** Builds trust in the AI contract. Uncovers calibration issues before users see them.

**Cons:** ~2-3 hours of manual testing. Requires test data spanning different screenshot types.

**Context:** The SYSTEM_PROMPT update (feat/monorepo-web) asks AI to return `confidence` as 0.0–1.0. `parse-result.ts` clamps the value. But clamping doesn't calibrate. May need to adjust the threshold (0.5 → 0.3 or 0.7) based on actual distribution, or add a second heuristic (e.g., confidence × field completeness).

**Effort:** S (human: ~3 hours / CC: ~20 min analysis + threshold tuning)

**Depends on:** SYSTEM_PROMPT confidence update (this branch) must be deployed first.

---

## Image compression quality floor for AI analysis (P2)

**What:** Define and enforce a minimum image quality floor before uploading screenshots to `/api/analyze`. Current plan: compress to <900KB. Risk: aggressive compression on text-heavy screenshots (menus, receipts, Threads posts) corrupts OCR-critical pixels before Gemini sees them.

**Why:** A blurry restaurant menu = wrong place name extracted. At minimum JPEG quality 85% should be enforced. For screenshots under 2MB, prefer lossless PNG. The size limit should be secondary to quality preservation.

**Pros:** Better OCR accuracy on the most important capture type (food/place screenshots with text).

**Cons:** Larger average upload size. Some screenshots over 1MB may need PNG→JPEG with quality floor instead of aggressive compression.

**Context:** Mobile compress-before-upload is in feat/monorepo-web as a latency mitigation for the server route. Quality floor needs to be specified as a compression algorithm decision, not just a size target. Suggested: use `expo-image-manipulator` with quality: 0.85 and resize only if width > 2048px.

**Effort:** S (human: ~2 hours / CC: ~15 min)

**Depends on:** Mobile AI unification (feat/monorepo-web) deployed first.

---

## Mobile AI emergency rollback feature flag (P2)

**What:** Add a server-side env var `AI_PROVIDER=gemini` (default) that can be flipped to `openai` to re-enable client-side AI on mobile. Implemented as a feature flag in the mobile app that reads from a remote config endpoint.

**Why:** Moving mobile from client-side GPT-4o to server-side Gemini is a one-way door. If the Next.js server goes down, mobile AI is completely dead with no degradation path. A flag gives a 30-minute emergency rollback without redeploying mobile.

**Pros:** Resilience. Emergency option if Gemini or Vercel has an outage during critical user testing.

**Cons:** Must maintain OpenAI SDK in mobile until flag is removed. Adds complexity to AI path.

**Context:** User chose "build it now in this PR" — implement as part of feat/monorepo-web. Simple env var check in the mobile analyzer factory.

**Effort:** S (human: ~4 hours / CC: ~20 min)

**Depends on:** Mobile AI unification (feat/monorepo-web) — implement alongside.

---

## Fix DAU definition: capture DAU → session DAU (P2)

**What:** The Phase 1 validation gate counts `distinct user_id WHERE created_at::date = CURRENT_DATE` (captures table). This is capture DAU — a user batch-uploading 10 old screenshots triggers the gate. Fix: track `last_seen_at` on the user record (updated on any authenticated API call), then count `distinct user_id WHERE last_seen_at::date = CURRENT_DATE`.

**Why:** The gate is meant to confirm that 10 real people are using the app daily. Capture DAU can be gamed by one power user and doesn't reflect actual daily engagement. Fix before the gate is used to make any real ship/no-ship decision.

**Pros:** Accurate signal for Phase 1 validation.

**Cons:** Requires `last_seen_at` middleware on every authenticated route (small but real touch to the request path).

**Context:** Fix before the web dashboard goes live to any real users. The current pg_cron SQL is in Migration 003 — update the WHERE clause once `last_seen_at` tracking is in place.

**Effort:** S (human: ~3 hours / CC: ~15 min)

**Depends on:** Supabase Auth setup (feat/monorepo-web) must be complete first.

---

## Replace emoji icons with SVG icon library (P2 — Design)

**What:** Sidebar navigation (🏠📍📝🗺), AnalyzeModal states (🤖❌📍📝), and UploadZone (📸) all use emoji as UI icons. Replace with lucide-react or similar SVG icon library.

**Why:** Emoji render inconsistently across OS/browser, look unpolished in a dark-themed "curated archive" app, and lack aria-label support for accessibility. This is the single biggest remaining visual quality gap from the design review.

**Pros:** Consistent rendering, proper accessibility, professional appearance, icon color/size control via CSS.

**Cons:** New dependency (~20KB gzipped for lucide-react). Requires design decision on icon style (outlined vs. filled).

**Context:** CaptureCard emoji were removed in commit `6f2413b`. Sidebar and modal emoji are deferred because they need an icon library rather than simple text replacement. See design review report: `~/.gstack/projects/ssongji1122-capsave/design-reports/2026-03-28-design-review.md`

**Effort:** S (human: ~2 hours / CC: ~15 min)

**Depends on:** Nothing.

---

## Add focus-visible keyboard navigation styles (P3 — Design)

**What:** Interactive elements (buttons, links, nav items) lack `focus-visible` ring outlines for keyboard navigation.

**Why:** WCAG 2.1 AA requires visible focus indicators. Current dark theme makes default browser focus rings invisible.

**Pros:** Keyboard accessibility, WCAG compliance.

**Cons:** Minor visual tuning needed to match design system colors.

**Context:** Suggested approach: add `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background` as a reusable utility or Tailwind plugin.

**Effort:** S (human: ~1 hour / CC: ~10 min)

**Depends on:** Nothing.
