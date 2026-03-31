# TODOS

## Mobile map-linker migration to shared package

**What:** Migrate `apps/mobile/services/map-linker.ts` to import from `@scrave/shared` instead of local copy.

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

**Context:** CaptureCard emoji were removed in commit `6f2413b`. Sidebar and modal emoji are deferred because they need an icon library rather than simple text replacement. See design review report: `~/.gstack/projects/ssongji1122-scrave/design-reports/2026-03-28-design-review.md`

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

---

## Fix Supabase Storage RLS policies (P1 — Security)

**What:** Migration 002 allows anonymous upload AND delete to the `captures` storage bucket. Any unauthenticated user can delete another user's images via the Supabase Storage API.

**Why:** This is a real data loss vulnerability. The captures TABLE has proper user-scoped RLS (migration 003), but the storage bucket was never tightened.

**Pros:** Prevents unauthorized image deletion/overwrite.

**Cons:** Requires a new migration (006). Guest upload flow needs adjustment — guests currently can't upload to storage anyway (they use sessionStorage).

**Context:** Add migration 006: drop the anon upload/delete policies, add user-scoped policies that check `auth.uid()` in the file path (`user_id/filename.jpg` pattern already exists in upload route).

**Effort:** S (human: ~2 hours / CC: ~15 min)

**Depends on:** Nothing.

---

## Fix in-memory guest rate limiter for Vercel (P2)

**What:** The guest rate limiter in `/api/analyze` uses an in-memory `Map()`. On Vercel serverless, each request can hit a different cold-started instance. The Map resets on every cold start, effectively disabling rate limiting.

**Why:** Guests can analyze unlimited images for free, burning Gemini API credits.

**Pros:** Prevents API abuse without auth.

**Cons:** Adds a DB query per guest request for rate checking.

**Context:** Replace with Supabase-backed counter: create a `guest_rate_limits` table keyed by IP+date, increment on each request, reject when count > 5. Alternative: use Vercel KV if available.

**Effort:** S (human: ~2 hours / CC: ~15 min)

**Depends on:** Nothing.

---

## Add file size + content-type validation to /api/upload (P2)

**What:** The upload route accepts any file size and hardcodes `contentType: 'image/jpeg'` regardless of actual file type. A PNG uploaded as "jpeg" will be stored with wrong metadata.

**Why:** Vercel's 4.5MB body limit provides implicit protection, but the error is opaque. Explicit validation gives clear error messages and prevents content-type mismatch.

**Pros:** Clear error messages, correct metadata, defense in depth.

**Cons:** Minimal effort.

**Context:** Check `file.size > 5 * 1024 * 1024` → reject with 413. Check `file.type` against allowlist (`image/jpeg`, `image/png`, `image/webp`) → use actual type for storage contentType.

**Effort:** S (human: ~1 hour / CC: ~10 min)

**Depends on:** Nothing.

---

## Add pagination to captures queries (P3)

**What:** `getAllCaptures` and `getCapturesByCategory` in `packages/shared/src/supabase/queries.ts` load ALL captures with `select('*')`. No pagination, no limit.

**Why:** At 1000+ captures, this query will be slow, memory-heavy on both server and client, and may timeout on Vercel's 10-second limit.

**Pros:** Scalable data access pattern.

**Cons:** Requires cursor-based pagination in UI components (FlatList on mobile already supports it, web needs infinite scroll or pagination controls).

**Context:** `searchCaptures` already has `limit`/`offset` — extend this pattern to `getAllCaptures` and `getCapturesByCategory`. Default limit: 50.

**Effort:** S (human: ~3 hours / CC: ~20 min)

**Depends on:** Nothing.

---

## Mobile image upload to Supabase Storage (P1 — Cross-device)

**What:** Mobile saves local `file://` URIs into the shared `image_url` column in Supabase. Images break on any device other than the original phone (web, second phone, after reinstall). Need to add Supabase Storage upload to the mobile capture flow.

**Why:** The shared `image_url` column is designed for public Storage URLs, not local filesystem paths. Any cross-device or cross-platform scenario shows broken images. This is a real user-facing bug, not a polish issue.

**Pros:** Images visible everywhere. True cross-device sync. Consistent with web upload flow.

**Cons:** Requires mobile upload pipeline (resize, upload to Storage, get public URL). Adds network dependency to capture save. Need offline queue for no-connectivity captures.

**Context:** Web already has `/api/upload` that stores to Supabase Storage. Mobile should either call the same endpoint or upload directly to Supabase Storage SDK. The `apps/mobile/app/capture/analyze.tsx:94` saves `manipulated.uri` (local file) directly to Supabase `image_url`. Fix: upload to Storage first, use returned URL.

**Effort:** M (human: ~8 hours / CC: ~45 min)

**Depends on:** Nothing.

---

## Switch to private storage bucket + signed URLs (P1 — Privacy)

**What:** The `captures` storage bucket is public (world-readable). Anyone who knows or guesses an image URL can view any user's screenshots. Also, deleting a capture only removes the DB row — the storage object stays forever, creating orphaned images.

**Why:** For a personal archive app that stores screenshots of social media, restaurant visits, and personal notes, public image URLs are a privacy leak. Orphaned storage objects grow storage costs indefinitely.

**Pros:** User images are private. Storage costs controlled. GDPR-friendly deletion.

**Cons:** Requires signed URL generation on every image load (adds ~50ms latency). Need to update all image display components to use signed URLs. Storage cleanup requires a trigger or delete hook.

**Context:** Migration 002 creates a public bucket. Fix: (1) New migration to set bucket to private, (2) Create a `getSignedUrl()` helper (Supabase SDK supports this), (3) Add `storage.from('captures').remove()` call in `deleteCapture()` query, (4) Update web CaptureCard and mobile CaptureCard to use signed URLs.

**Effort:** M (human: ~6 hours / CC: ~30 min)

**Depends on:** Nothing.

---

## Batch analysis provenance mapping (P2)

**What:** The batch analysis API returns an unordered `results` array. The UI maps results to images by array index, which breaks when AI merges multiple screenshots into one result (e.g., Threads carousel 1/17, 2/17). The first image gets used for the merged result, destroying provenance.

**Why:** Wrong screenshot attached to wrong analysis result. Users see mismatched thumbnails and metadata.

**Pros:** Correct image-to-analysis mapping. Trustworthy batch results.

**Cons:** Requires prompt engineering to get Gemini to return image indices in its response. May need post-processing to validate mapping.

**Context:** `apps/web/src/app/api/analyze-batch/route.ts:101` returns `results` array. `BatchAnalyzeModal.tsx:87` maps by index. Fix: add `imageIndices: number[]` to each result in the Gemini prompt, validate in `parseBatchAnalysisResult()`.

**Effort:** S (human: ~4 hours / CC: ~20 min)

**Depends on:** Nothing.
