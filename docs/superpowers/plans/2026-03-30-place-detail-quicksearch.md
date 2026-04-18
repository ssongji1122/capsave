# Place Detail Quick Search Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 장소 상세 화면에 플랫폼별 퀵서치 아이콘 바(네이버맵·인스타·블로그·유튜브)를 추가하고, AI 분석 시 장소별 description을 추출하며, 지도앱 선택지를 네이버맵/구글맵 2개로 단순화한다.

**Architecture:** 기존 `app/capture/[id].tsx` 상세 화면 안에서 처리. 신규 라우트 없음. `PlaceInfo` 타입에 `description` 필드 추가, 신규 `PlaceQuickSearch` 컴포넌트로 아이콘 바 분리, `map-linker.ts`에서 카카오 제거.

**Tech Stack:** React Native (Expo), TypeScript, expo-router, Linking API, OpenAI GPT-4o

---

## File Map

| 파일 | 역할 |
|------|------|
| `apps/mobile/services/analyzers/types.ts` | `PlaceInfo`에 `description` 추가 |
| `apps/mobile/services/analyzers/openai-analyzer.ts` | 프롬프트에 description 추출 추가 |
| `apps/mobile/services/map-linker.ts` | kakao 제거 → naver + google 2개만 |
| `apps/mobile/components/PlaceQuickSearch.tsx` | 신규: 아이콘 4개 + 지도앱 열기 버튼 |
| `apps/mobile/app/capture/[id].tsx` | PlaceQuickSearch 통합, description/links 노출 |
| `apps/mobile/components/CaptureCard.tsx` | ActionSheet naver+google 2개로 통일 |

---

### Task 1: PlaceInfo 타입에 description 필드 추가

**Files:**
- Modify: `apps/mobile/services/analyzers/types.ts`

- [ ] **Step 1: `description` 필드 추가**

`apps/mobile/services/analyzers/types.ts`를 다음과 같이 수정:

```ts
export type CaptureCategory = 'place' | 'text';
export type SourceApp = 'instagram' | 'threads' | 'naver' | 'google' | 'youtube' | 'other';

export interface PlaceInfo {
  name: string;
  address?: string;
  date?: string;
  description?: string;  // AI가 뽑은 장소별 1-2줄 설명
  links?: string[];
  lat?: number;
  lng?: number;
}

export interface AnalysisResult {
  category: CaptureCategory;
  title: string;
  summary: string;
  places: PlaceInfo[];
  extractedText: string;
  links: string[];
  tags: string[];
  source: SourceApp;
  confidence: number;
  sourceAccountId: string | null;
}

export interface ImageAnalyzer {
  analyze(imageUri: string): Promise<AnalysisResult>;
}
```

- [ ] **Step 2: TypeScript 오류 없는지 확인**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음 (description은 optional이므로 기존 코드 영향 없음)

- [ ] **Step 3: 커밋**

```bash
git add apps/mobile/services/analyzers/types.ts
git commit -m "feat: add description field to PlaceInfo"
```

---

### Task 2: map-linker.ts — 카카오 제거, naver+google 2개만

**Files:**
- Modify: `apps/mobile/services/map-linker.ts`

- [ ] **Step 1: kakao 항목 제거**

`apps/mobile/services/map-linker.ts`의 `getMapLinks` 함수를 다음으로 교체:

```ts
export function getMapLinks(placeName: string, address?: string | null): MapLink[] {
  const query = address ? `${placeName} ${address}` : placeName;
  const encoded = encodeQuery(query);
  const placeEncoded = encodeQuery(placeName);

  return [
    {
      provider: 'naver',
      label: '네이버맵',
      emoji: '🟢',
      appUrl: `nmap://search?query=${placeEncoded}&appname=com.scrave.app`,
      webUrl: `https://map.naver.com/v5/search/${encoded}`,
    },
    {
      provider: 'google',
      label: 'Google Maps',
      emoji: '🔵',
      appUrl: Platform.select({
        ios: `comgooglemaps://?q=${encoded}`,
        default: `geo:0,0?q=${encoded}`,
      }) || `geo:0,0?q=${encoded}`,
      webUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    },
  ];
}
```

`MapProvider` 타입도 업데이트:

```ts
export type MapProvider = 'naver' | 'google';
```

- [ ] **Step 2: TypeScript 오류 확인**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/mobile/services/map-linker.ts
git commit -m "feat: remove kakao from map links, keep naver+google only"
```

---

### Task 3: PlaceQuickSearch 컴포넌트 신규 생성

**Files:**
- Create: `apps/mobile/components/PlaceQuickSearch.tsx`

- [ ] **Step 1: 컴포넌트 생성**

`apps/mobile/components/PlaceQuickSearch.tsx` 신규 파일:

```tsx
import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
  Linking,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { openMap, getMapLinks } from '@/services/map-linker';
import { isUrlSafe } from '@/services/url-validator';

interface PlaceQuickSearchProps {
  placeName: string;
  address?: string | null;
}

const SEARCH_ICONS = [
  {
    key: 'navermap',
    emoji: '🗺️',
    label: '네이버맵',
    appUrl: (q: string) => `nmap://search?query=${encodeURIComponent(q)}&appname=com.scrave.app`,
    webUrl: (q: string) => `https://map.naver.com/v5/search/${encodeURIComponent(q)}`,
    bgColor: 'rgba(3,199,90,0.12)',
  },
  {
    key: 'instagram',
    emoji: '📷',
    label: '인스타그램',
    appUrl: (q: string) => `instagram://search?q=${encodeURIComponent(q)}`,
    webUrl: (q: string) =>
      `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`,
    bgColor: 'rgba(225,48,108,0.12)',
  },
  {
    key: 'naverblog',
    emoji: '✍️',
    label: '네이버블로그',
    appUrl: null,
    webUrl: (q: string) =>
      `https://search.naver.com/search.naver?query=${encodeURIComponent(q + ' 후기')}`,
    bgColor: 'rgba(3,199,90,0.08)',
  },
  {
    key: 'youtube',
    emoji: '▶️',
    label: '유튜브',
    appUrl: (q: string) =>
      `vnd.youtube://results?search_query=${encodeURIComponent(q)}`,
    webUrl: (q: string) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    bgColor: 'rgba(255,0,0,0.10)',
  },
] as const;

async function openSearchUrl(
  appUrl: string | null,
  webUrl: string
): Promise<void> {
  if (appUrl) {
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen && isUrlSafe(appUrl)) {
        await Linking.openURL(appUrl);
        return;
      }
    } catch {
      // fall through to web
    }
  }
  if (isUrlSafe(webUrl)) {
    await Linking.openURL(webUrl);
  }
}

export function PlaceQuickSearch({ placeName, address }: PlaceQuickSearchProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const query = address ? `${placeName} ${address}` : placeName;

  const handleIconPress = useCallback(
    async (icon: (typeof SEARCH_ICONS)[number]) => {
      const appUrl = icon.appUrl ? icon.appUrl(query) : null;
      const webUrl = icon.webUrl(query);
      await openSearchUrl(appUrl, webUrl);
    },
    [query]
  );

  const handleMapOpen = useCallback(() => {
    const links = getMapLinks(placeName, address);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: placeName,
          message: address ?? undefined,
          options: [...links.map((l) => `${l.emoji} ${l.label}`), '취소'],
          cancelButtonIndex: links.length,
        },
        (idx) => {
          if (idx < links.length) {
            openMap(links[idx].provider, placeName, address ?? null);
          }
        }
      );
    } else {
      Alert.alert(
        placeName,
        address ?? undefined,
        [
          ...links.map((l) => ({
            text: `${l.emoji} ${l.label}`,
            onPress: () => openMap(l.provider, placeName, address ?? null),
          })),
          { text: '취소', style: 'cancel' as const },
        ]
      );
    }
  }, [placeName, address]);

  return (
    <View style={styles.row}>
      {SEARCH_ICONS.map((icon) => (
        <TouchableOpacity
          key={icon.key}
          style={[styles.iconBtn, { backgroundColor: icon.bgColor }]}
          onPress={() => handleIconPress(icon)}
          activeOpacity={0.7}
          accessibilityLabel={`${icon.label}에서 검색`}
        >
          <Text style={styles.iconEmoji}>{icon.emoji}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.mapOpenBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
        onPress={handleMapOpen}
        activeOpacity={0.7}
      >
        <Text style={[styles.mapOpenText, { color: colors.textTertiary }]}>지도앱 열기 ›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 17,
  },
  mapOpenBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapOpenText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: TypeScript 오류 확인**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/mobile/components/PlaceQuickSearch.tsx
git commit -m "feat: add PlaceQuickSearch component with 4 platform icons"
```

---

### Task 4: app/capture/[id].tsx — PlaceQuickSearch 통합 + description/links 노출

**Files:**
- Modify: `apps/mobile/app/capture/[id].tsx`

- [ ] **Step 1: import 추가**

`[id].tsx` 상단 import에 추가:

```ts
import { PlaceQuickSearch } from '@/components/PlaceQuickSearch';
```

- [ ] **Step 2: 장소 섹션 교체**

기존 `{isPlace && item.places.length > 0 && (...)}` 장소 렌더링 블록을 아래로 교체:

```tsx
{isPlace && item.places.length > 0 && (
  <View style={[styles.section, { borderTopColor: colors.border }]}>
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>장소</Text>
    {item.places.map((place, idx) => (
      <View key={idx} style={idx < item.places.length - 1 ? styles.placeBlockGap : undefined}>
        {/* 장소 행 — 탭하면 ActionSheet (네이버맵/구글맵) */}
        <TouchableOpacity
          style={[styles.placeRow, { backgroundColor: surfaceColor }]}
          onPress={() => handleMapPicker(place)}
          activeOpacity={0.7}
        >
          <View style={[styles.placeIndex, { backgroundColor: accentColor }]}>
            <Text style={styles.placeIndexText}>{idx + 1}</Text>
          </View>
          <View style={styles.placeTextGroup}>
            <Text style={[styles.placeName, { color: colors.text }]}>{place.name}</Text>
            {place.address ? (
              <Text style={[styles.placeAddress, { color: colors.textSecondary }]}>
                {place.address}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* 장소별 설명 */}
        {place.description ? (
          <Text style={[styles.placeDescription, { color: colors.textTertiary }]}>
            {place.description}
          </Text>
        ) : null}

        {/* 퀵서치 아이콘 바 */}
        <PlaceQuickSearch
          placeName={place.name}
          address={place.address}
        />

        {/* 장소별 연관링크 */}
        {place.links && place.links.length > 0 && (
          <View style={styles.placeLinks}>
            {place.links.map((link, li) => (
              <TouchableOpacity
                key={li}
                style={[styles.placeLinkBtn, { backgroundColor: surfaceColor, borderColor }]}
                onPress={() => openUrl(link)}
                activeOpacity={0.7}
              >
                <Ionicons name="link" size={12} color={accentColor} />
                <Text style={[styles.placeLinkText, { color: accentColor }]} numberOfLines={1}>
                  {link}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    ))}
  </View>
)}
```

- [ ] **Step 3: 스타일 추가**

`StyleSheet.create({...})` 안에 추가:

```ts
placeBlockGap: {
  marginBottom: 14,
},
placeDescription: {
  fontSize: 12,
  lineHeight: 18,
  paddingHorizontal: 4,
  paddingTop: 4,
},
placeLinks: {
  paddingTop: 6,
  gap: 4,
},
placeLinkBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: 10,
  borderWidth: StyleSheet.hairlineWidth,
  gap: 6,
},
placeLinkText: {
  fontSize: 11,
  flex: 1,
},
```

- [ ] **Step 4: TypeScript 오류 확인**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/mobile/app/capture/[id].tsx
git commit -m "feat: integrate PlaceQuickSearch into capture detail, show description and links"
```

---

### Task 5: CaptureCard.tsx — ActionSheet naver+google 2개로 통일

**Files:**
- Modify: `apps/mobile/components/CaptureCard.tsx`

- [ ] **Step 1: handleMapPicker의 ActionSheet 옵션 확인**

`CaptureCard.tsx`의 `handleMapPicker`는 `getMapLinks`를 그대로 사용하므로 Task 2에서 kakao를 제거한 `getMapLinks`를 반환하면 자동으로 2개만 표시된다. 추가 변경 불필요.

단, `PlaceQuickSearch` 는 CaptureCard에는 추가하지 않는다 — CaptureCard는 리스트 뷰 요약용이고 퀵서치 바는 상세 화면(`[id].tsx`)에서만 표시한다.

- [ ] **Step 2: TypeScript 오류 확인**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음. (map-linker가 이미 2개로 줄었으므로 CaptureCard 추가 변경 없음)

- [ ] **Step 3: 커밋 (변경사항 있을 경우만)**

```bash
git add apps/mobile/components/CaptureCard.tsx
git commit -m "fix: CaptureCard map picker now shows naver+google only (via map-linker)"
```

---

### Task 6: AI 프롬프트에 description 추출 추가

**Files:**
- Modify: `apps/mobile/services/analyzers/openai-analyzer.ts`

- [ ] **Step 1: SYSTEM_PROMPT의 places 스키마에 description 추가**

`openai-analyzer.ts`의 `SYSTEM_PROMPT`에서 `places` 배열 부분을 다음으로 교체:

```ts
const SYSTEM_PROMPT = `You are an AI assistant that analyzes screenshots from mobile apps.
Your job is to extract structured information from the screenshot.
IMPORTANT: All text fields MUST be written in Korean (한국어).

Analyze the image and respond with a JSON object containing:

{
  "category": "place" or "text",
  "title": "핵심 내용을 요약한 간결한 한국어 제목",
  "summary": "주요 정보를 1-2문장으로 한국어 요약",
  "places": [
    {
      "name": "장소 이름",
      "address": "주소 (없으면 생략)",
      "date": "일정/날짜 (없으면 생략)",
      "description": "이 장소의 특징을 1-2문장으로 한국어로 설명. 메뉴, 분위기, 특이사항, 가격대 등 캡처에서 언급된 내용 중심. 언급 없으면 빈 문자열.",
      "links": ["해당 장소에 대한 검색/참고 URL"]
    }
  ],
  "extractedText": "이미지에서 추출한 모든 중요 텍스트 (한국어 원문 유지)",
  "links": ["장소와 관련 없는 일반 링크만"],
  "tags": ["3-5개 한국어 태그"],
  "source": "instagram" | "threads" | "naver" | "google" | "youtube" | "other",
  "confidence": 0.0 to 1.0,
  "sourceAccountId": "@account_id or null"
}

Rules:
- If the screenshot contains a restaurant, cafe, hotel, tourist spot, or any physical location → category = "place"
- If it contains AI tips, code, articles, recipes, product info, or general text → category = "text"
- For "place" category: Extract ALL places into the "places" array.
- For "text" category: Set "places" to an empty array [].
- For "confidence": Float 0.0–1.0 indicating classification confidence.
- For "sourceAccountId": Extract visible social media account ID. null if not visible.
- Respond ONLY with valid JSON. No markdown, no code fences, no extra text.
- ALL text output MUST be in Korean.`;
```

- [ ] **Step 2: 응답 파싱에서 description 포함되도록 확인**

`return` 블록의 `places` 파싱 부분을 확인. 현재 코드:

```ts
places: Array.isArray(result.places) ? result.places.filter((p: { name?: string }) => p.name) : [],
```

`PlaceInfo`가 이미 `description?: string`을 포함하고, JSON 파싱 후 객체를 그대로 사용하므로 추가 변경 불필요. `description`이 응답에 포함되면 자동으로 포함된다.

- [ ] **Step 3: TypeScript 오류 확인**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/mobile/services/analyzers/openai-analyzer.ts
git commit -m "feat: add description extraction to AI prompt for each place"
```

---

### Task 7: 시뮬레이터에서 전체 플로우 검증

- [ ] **Step 1: 빌드 및 실행**

```bash
cd apps/mobile && npx expo run:ios
```

- [ ] **Step 2: 기존 캡처에서 확인**

1. 앱 실행 → 홈 탭 → 장소가 있는 캡처 카드 탭
2. `[id].tsx` 상세 화면 진입 확인
3. 장소 섹션에서 아이콘 4개(🗺️📷✍️▶️) + "지도앱 열기 ›" 버튼 표시 확인
4. 아이콘 탭 → 해당 앱/웹으로 이동 확인
5. "지도앱 열기 ›" 탭 → ActionSheet에 네이버맵, Google Maps 2개만 표시 확인

- [ ] **Step 3: 새 캡처로 description 확인**

1. 홈 탭 → + 버튼 → 시뮬레이터 갤러리에서 장소 관련 스크린샷 선택
2. AI 분석 완료 후 장소 상세에서 `description` 텍스트 표시 확인 (캡처에 설명이 있는 경우)

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat: place detail quick search icons complete"
```
