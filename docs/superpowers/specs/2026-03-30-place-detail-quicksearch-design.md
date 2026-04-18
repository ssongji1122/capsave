# Place Detail & Quick Search Icons — Design Spec

**Date:** 2026-03-30
**Branch:** claude/exciting-hopper
**Status:** Approved

---

## 1. Problem

Scrave의 핵심 flow는 스크린캡처 → AI 분류 → 원클릭 저장 → 원클릭 검색이다. 현재 장소 카드는 저장까지는 되지만 "원클릭 검색"이 약하다:

- 장소 행 탭 → ActionSheet (네이버 / Google / 카카오) 3개 선택 → 지도앱으로 이동: 클릭 2회 + 선택 1회 = 마찰 과다
- 인스타, 유튜브, 블로그로 추가 탐색하려면 앱을 나가서 직접 검색해야 함
- 장소별 설명이 없어 저장한 맥락을 잃음

---

## 2. Solution Overview

`app/capture/[id].tsx`의 장소 섹션을 확장한다. 새 라우트 없이 기존 상세 화면 안에서 처리.

### 장소 행 (기존 유지)
탭 → ActionSheet (네이버맵 / Google Maps 2개만). 카카오맵 제거.

### 장소별 퀵서치 아이콘 바 (신규)
각 장소 행 아래에 4개 아이콘을 추가한다. 텍스트 없이 아이콘만.

| 아이콘 | 플랫폼 | 앱 딥링크 | 웹 fallback |
|--------|--------|-----------|------------|
| 🗺️ | 네이버맵 | `nmap://search?query={name}` | `https://map.naver.com/v5/search/{query}` |
| 📷 | 인스타그램 | `instagram://search?q={name}` | `https://www.instagram.com/explore/search/keyword/?q={name}` |
| ✍️ | 네이버 블로그 | — (웹만) | `https://search.naver.com/search.naver?query={name}+후기` |
| ▶️ | 유튜브 | `vnd.youtube://results?search_query={name}` | `https://www.youtube.com/results?search_query={name}` |

앱 설치 여부는 `Linking.canOpenURL`로 확인 후 딥링크 시도, 실패 시 웹 fallback. 기존 `openUrl` 패턴 재사용.

검색어는 `place.name + (place.address가 있으면 공백+address)` 조합.

### 장소별 설명 (신규)
`PlaceInfo`에 `description?: string` 필드 추가. AI 분석 시 장소마다 1-2줄 설명 추출.

### 장소별 연관링크 (신규)
`PlaceInfo`에 이미 `links?: string[]` 필드가 있다. AI가 캡처 본문에서 장소별 링크를 추출해 채운다. 상세 화면에서 링크 목록으로 노출.

---

## 3. Data Model Changes

### `PlaceInfo` (types.ts)
```ts
// Before
export interface PlaceInfo {
  name: string;
  address?: string;
  date?: string;
  links?: string[];
  lat?: number;
  lng?: number;
}

// After
export interface PlaceInfo {
  name: string;
  address?: string;
  date?: string;
  description?: string;   // NEW: AI가 뽑은 장소별 한두 줄 설명
  links?: string[];       // 기존: 장소별 연관 URL
  lat?: number;
  lng?: number;
}
```

### DB schema
`captures` 테이블의 `places` 컬럼은 JSON string으로 저장되므로 스키마 마이그레이션 불필요. `PlaceInfo` 인터페이스 변경만으로 충분.

### Supabase
`captures.places` 컬럼도 JSON이므로 동일하게 마이그레이션 불필요.

---

## 4. AI Analyzer Changes

`apps/mobile/services/analyzers/` 의 OpenAI 프롬프트에 `description` 추출을 추가한다.

**프롬프트 추가 지시:**
```
For each place, extract a short description (1-2 sentences) from the screenshot text
that describes what makes this place notable — e.g. menu item, specialty, price range,
atmosphere, or any key detail mentioned. Leave empty string if no description is available.
```

**응답 JSON 예시:**
```json
{
  "places": [
    {
      "name": "토토파",
      "address": "도쿄 시부야구",
      "description": "도쿄 인기 토탈케어 사우나. 암반욕 + 수면실 완비.",
      "links": ["https://totofa.jp"]
    }
  ]
}
```

---

## 5. UI Components

### `PlaceQuickSearch` (신규 컴포넌트)
`components/PlaceQuickSearch.tsx`

```tsx
interface PlaceQuickSearchProps {
  placeName: string;
  address?: string;
  accentColor: string;
}
```

장소 행 바로 아래에 렌더링. 아이콘 4개 + 우측에 "지도앱 열기 ›" 버튼.

- 아이콘 크기: 34×34px, 모서리 10px
- 각 아이콘 배경: 플랫폼 브랜드 컬러 12-15% 투명도
- "지도앱 열기 ›": 작은 텍스트 버튼, onPress → ActionSheet (네이버맵 / Google Maps)

### `app/capture/[id].tsx` 수정
- 장소 행 + `PlaceQuickSearch` 를 하나의 묶음으로 렌더링
- `place.description`이 있으면 장소 행 아래, 아이콘 위에 회색 소문자로 표시
- `place.links`가 있으면 아이콘 아래에 링크 목록 노출

### `map-linker.ts` 수정
- `getMapLinks` 에서 kakao 제거 → naver, google 2개만 반환
- `openMap` 로직은 그대로 유지

---

## 6. Layout (장소 1개 기준)

```
┌─────────────────────────────────────────┐
│  1  토토파                      도쿄 시부야구 │  ← 탭: ActionSheet
└─────────────────────────────────────────┘
  도쿄 인기 토탈케어 사우나. 암반욕 + 수면실 완비.  ← description (있을 때만)
  🗺️  📷  ✍️  ▶️                   지도앱 열기 ›   ← 퀵서치 아이콘 바
  🔗 https://totofa.jp                             ← links (있을 때만)
```

---

## 7. Files to Change

| 파일 | 변경 내용 |
|------|----------|
| `services/analyzers/types.ts` | `PlaceInfo`에 `description?: string` 추가 |
| `services/analyzers/openai-analyzer.ts` (또는 해당 analyzer) | 프롬프트에 description 추출 지시 추가 |
| `services/map-linker.ts` | kakao 제거, naver + google 2개만 |
| `components/PlaceQuickSearch.tsx` | 신규: 아이콘 4개 + 지도앱 열기 버튼 |
| `app/capture/[id].tsx` | PlaceQuickSearch 통합, description/links 노출 |
| `components/CaptureCard.tsx` | 장소 행 ActionSheet도 naver+google 2개로 통일 |

---

## 8. Out of Scope

- TikTok, Kakao 아이콘 (추후 설정에서 커스터마이징 가능하도록)
- 장소 전용 신규 라우트 (`/capture/place/[id]/[idx]`)
- 방문 체크, 메모 기능
- 아이콘 바 플랫폼 사용자 커스터마이징
