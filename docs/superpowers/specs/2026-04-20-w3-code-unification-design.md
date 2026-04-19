# W3: Code Unification (P2) — Design

**Date:** 2026-04-20
**Scope:** Council-identified P2 — eliminate the duplicate map-linker between mobile and shared.
**Out of scope:** W1/W2/W4/W5.

## Problem

`apps/mobile/services/map-linker.ts` is a stale fork of the shared map-linker:

- Different provider list (mobile: naver+google; shared: tmap+naver+google+kakao).
- Tmap (added to shared in March) is invisible to mobile.
- The shared `url-validator` only allows `http:` / `https:` — moving mobile to import from shared would silently break deep links (`nmap://`, `kakaomap://`, `comgooglemaps://`, `geo:`, `tmap://`).

Two implementations drift over time. We want one source of truth for URL building, with platform-specific glue (React Native `Linking`) staying in mobile only.

## Goals

- Single `@scrave/shared` source for map URL construction.
- Mobile uses every provider that shared supports (tmap + naver + google + kakao).
- Web `isUrlSafe` stays http/https-only (no security regression for the dashboard).
- Mobile callers get the deep-link schemes they need without duplicating the validator.

## Non-goals

- Removing the mobile-specific `openMap` / `openUrl` functions — they call `Linking` and `Alert` from React Native, which has no web equivalent.
- Changing the visible labels, emojis, or ordering of map links.
- Migrating the `MapView` web component (already imports from shared).

## Design

### 1. `url-validator` — opt-in extra schemes

Extend the shared validator to accept caller-supplied schemes without weakening the default. Web continues to call `isUrlSafe(url)` and gets http/https-only behavior; mobile calls `isUrlSafe(url, MOBILE_DEEP_LINK_SCHEMES)`.

```ts
// packages/shared/src/utils/url-validator.ts
const DEFAULT_SCHEMES = ['https:', 'http:'];

export const MOBILE_DEEP_LINK_SCHEMES = [
  'nmap:',
  'kakaomap:',
  'comgooglemaps:',
  'geo:',
  'tmap:',
] as const;

export function isUrlSafe(url: string, extraSchemes: readonly string[] = []): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().trim();
  return [...DEFAULT_SCHEMES, ...extraSchemes].some((s) => lower.startsWith(s));
}

export function sanitizeUrl(url: string, extraSchemes: readonly string[] = []): string | null {
  return isUrlSafe(url, extraSchemes) ? url : null;
}
```

### 2. `map-linker` — `getMobileMapLinks` builder

Add a sibling function to shared that returns the deep-link + web-fallback pairs mobile needs. Web `getMapLinks` is unchanged.

```ts
// packages/shared/src/utils/map-linker.ts (additions)

export interface MobileMapLink extends MapLink {
  appUrl: string;
  iosAppUrl?: string; // platform-specific override (Google Maps on iOS uses comgooglemaps://)
}

export function getMobileMapLinks(placeName: string, address?: string | null): MobileMapLink[] {
  const query = address ? `${placeName} ${address}` : placeName;
  const encoded = encodeURIComponent(query);
  const placeEncoded = encodeURIComponent(placeName);
  const baseLinks = getMapLinks(placeName, address);

  const appUrlByProvider: Record<MapProvider, { appUrl: string; iosAppUrl?: string }> = {
    tmap:   { appUrl: `tmap://search?name=${placeEncoded}` },
    naver:  { appUrl: `nmap://search?query=${placeEncoded}&appname=com.scrave.app` },
    kakao:  { appUrl: `kakaomap://search?q=${placeEncoded}` },
    google: { appUrl: `geo:0,0?q=${encoded}`, iosAppUrl: `comgooglemaps://?q=${encoded}` },
  };

  return baseLinks.map((link) => ({ ...link, ...appUrlByProvider[link.provider] }));
}
```

### 3. Mobile — delete fork, keep Linking glue

- Delete `apps/mobile/services/url-validator.ts` (and the test in `apps/mobile/services/__tests__/url-validator.test.ts` — already covered by shared tests).
- Rewrite `apps/mobile/services/map-linker.ts` to use shared builders + `MOBILE_DEEP_LINK_SCHEMES`:

```ts
import { Linking, Alert, Platform } from 'react-native';
import {
  isUrlSafe,
  MOBILE_DEEP_LINK_SCHEMES,
  getMobileMapLinks,
  type MapProvider,
} from '@scrave/shared';

export { type MapProvider };

export function getMapLinks(placeName: string, address?: string | null) {
  return getMobileMapLinks(placeName, address);
}

export async function openMap(provider: MapProvider, placeName: string, address?: string | null) {
  const link = getMobileMapLinks(placeName, address).find((l) => l.provider === provider);
  if (!link) return;

  const appUrl = Platform.OS === 'ios' && link.iosAppUrl ? link.iosAppUrl : link.appUrl;

  try {
    if (await Linking.canOpenURL(appUrl) && isUrlSafe(appUrl, MOBILE_DEEP_LINK_SCHEMES)) {
      await Linking.openURL(appUrl);
      return;
    }
    if (isUrlSafe(link.webUrl)) {
      await Linking.openURL(link.webUrl);
      return;
    }
    Alert.alert('오류', `${link.label}을(를) 열 수 없습니다.`);
  } catch {
    if (isUrlSafe(link.webUrl)) {
      await Linking.openURL(link.webUrl).catch(() => {
        Alert.alert('오류', `${link.label}을(를) 열 수 없습니다.`);
      });
    } else {
      Alert.alert('오류', `${link.label}을(를) 열 수 없습니다.`);
    }
  }
}

export async function openUrl(url: string): Promise<void> {
  if (!isUrlSafe(url)) {
    Alert.alert('안전하지 않은 링크', '이 링크는 열 수 없습니다.');
    return;
  }
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    } else {
      Alert.alert('오류', '해당 링크를 열 수 없습니다.');
    }
  } catch {
    Alert.alert('오류', '링크를 여는 중 오류가 발생했습니다.');
  }
}
```

The `MapLink` interface stays compatible (existing call sites destructure `provider`, `label`, `emoji`, `webUrl`).

## Testing (TDD)

### Shared

`packages/shared/src/__tests__/url-validator.test.ts` — extend with:

- `isUrlSafe('nmap://search?q=test')` → `false` by default.
- `isUrlSafe('nmap://search?q=test', MOBILE_DEEP_LINK_SCHEMES)` → `true`.
- `isUrlSafe('tmap://search?name=x', MOBILE_DEEP_LINK_SCHEMES)` → `true`.
- `isUrlSafe('javascript:alert(1)', MOBILE_DEEP_LINK_SCHEMES)` → `false` (extras don't bypass the basic blocklist).
- `MOBILE_DEEP_LINK_SCHEMES` exports the 5 expected entries.

`packages/shared/src/__tests__/map-linker.test.ts` — new cases for `getMobileMapLinks`:

- Returns 4 entries (tmap, naver, google, kakao) with both `appUrl` and `webUrl` populated.
- Tmap appUrl is `tmap://search?name=...`.
- Naver appUrl is `nmap://search?query=...&appname=com.scrave.app`.
- Kakao appUrl is `kakaomap://search?q=...`.
- Google has `iosAppUrl: comgooglemaps://...` and `appUrl: geo:0,0?q=...`.
- All `webUrl` values match the existing `getMapLinks` output (regression guard).

### Mobile

Delete `apps/mobile/services/__tests__/url-validator.test.ts` (logic now in shared). Existing `PlaceQuickSearch.test.ts` exercises the consumer surface; no new mobile test needed.

## Migration

- No DB changes.
- No public web-facing API changes.
- Mobile callers (`apps/mobile/app/capture/analyze.tsx`, `apps/mobile/components/PlaceQuickSearch.tsx`) keep importing from `@/services/map-linker` — internal only.
- New providers (Tmap, Kakao) become available on mobile automatically because the shared list is the source.

## Risks

- **Tmap deep link unverified** — `tmap://search?name=...` is the documented scheme but we have no integration test on a device. Mitigation: web fallback (`https://tmap.life/search?query=...`) covers the case where the app isn't installed.
- **Google Maps iOS scheme requires CFBundleURLTypes / LSApplicationQueriesSchemes** — already configured in `apps/mobile/app.config.ts` for the existing `comgooglemaps` query; need to add `nmap`, `kakaomap`, `tmap` if not present.
- **Empty extraSchemes side effect**: `isUrlSafe(url, [])` is identical to `isUrlSafe(url)`. Documented in the spec; no behavior change for default callers.

## File touch list

**Modified:**
- `packages/shared/src/utils/url-validator.ts` — add `extraSchemes` param + export `MOBILE_DEEP_LINK_SCHEMES`
- `packages/shared/src/utils/map-linker.ts` — append `getMobileMapLinks` + `MobileMapLink` type
- `packages/shared/src/index.ts` — re-export new symbols
- `packages/shared/src/__tests__/url-validator.test.ts` — add 5 new cases
- `packages/shared/src/__tests__/map-linker.test.ts` — add `getMobileMapLinks` cases
- `apps/mobile/services/map-linker.ts` — rewrite as thin Linking/Alert glue over shared
- `apps/mobile/app.config.ts` — verify/add `LSApplicationQueriesSchemes` entries for nmap/kakaomap/tmap

**Deleted:**
- `apps/mobile/services/url-validator.ts`
- `apps/mobile/services/__tests__/url-validator.test.ts`
