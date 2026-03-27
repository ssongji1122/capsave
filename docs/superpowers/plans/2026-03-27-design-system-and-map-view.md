# Design System Update + Place Map UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the new DESIGN.md design system (colors, typography, spacing) to the existing web app, redesign capture cards with numbered place lists, and add a fullscreen map view at `/map` with Naver/Google Maps toggle.

**Architecture:** Three phases: (1) Update CSS theme tokens and fonts to match DESIGN.md, (2) Redesign CaptureCard to use numbered place list + single "지도에서 보기" button, (3) Build `/map` page with fullscreen map, geocoding API route, and bottom sheet. Each phase produces a working, committable state.

**Tech Stack:** Next.js 15, Tailwind CSS v4, Naver Maps JavaScript API v3, Google Maps JavaScript API, Supabase (PostgreSQL + Storage), Pretendard + JetBrains Mono + Space Grotesk fonts

---

## File Structure

### Phase 1: Design System Update
- Modify: `apps/web/src/app/globals.css` — Update all color tokens to DESIGN.md values
- Modify: `apps/web/src/app/layout.tsx` — Add font loading links
- Modify: `apps/web/src/components/layout/Sidebar.tsx` — Add 🗺 지도 nav item
- Modify: `apps/web/src/components/upload/AnalyzeModal.tsx` — Update colors to new tokens

### Phase 2: CaptureCard Redesign
- Modify: `apps/web/src/components/captures/CaptureCard.tsx` — Numbered place list, single map button

### Phase 3: Map View
- Modify: `packages/shared/src/types/capture.ts` — Add lat/lng to PlaceInfo
- Create: `apps/web/src/app/api/geocode/route.ts` — Server-side geocoding API
- Create: `apps/web/src/app/map/page.tsx` — Map page shell
- Create: `apps/web/src/components/map/MapView.tsx` — Map container with provider toggle
- Create: `apps/web/src/components/map/NaverMap.tsx` — Naver Maps implementation
- Create: `apps/web/src/components/map/GoogleMap.tsx` — Google Maps implementation
- Create: `apps/web/src/components/map/PlacePin.tsx` — Custom pin component
- Create: `apps/web/src/components/map/BottomSheet.tsx` — Sliding bottom sheet with place cards
- Create: `apps/web/src/components/map/PlacePopup.tsx` — Pin click info popup

---

## Task 1: Update CSS Theme Tokens

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Replace all color tokens in globals.css**

```css
@import "tailwindcss";

@theme {
  /* Backgrounds */
  --color-background: #050508;
  --color-surface: #0D0D12;
  --color-surface-elevated: #14141B;
  --color-border: #1E1E28;
  --color-border-light: #2A2A35;

  /* Text */
  --color-text-primary: #E8D5B7;
  --color-text-secondary: #9B9B9B;
  --color-text-tertiary: #5A5A65;

  /* Primary */
  --color-primary: #F4845F;
  --color-primary-light: #F69E80;
  --color-primary-dark: #C4684A;
  --color-primary-surface: rgba(244, 132, 95, 0.10);
  --color-primary-border: rgba(244, 132, 95, 0.25);

  /* Place accent */
  --color-place-accent: #34D399;
  --color-place-surface: rgba(52, 211, 153, 0.08);
  --color-place-border: rgba(52, 211, 153, 0.20);

  /* Text accent */
  --color-text-accent: #7DD3FC;
  --color-text-surface: rgba(125, 211, 252, 0.08);
  --color-text-border: rgba(125, 211, 252, 0.20);

  /* AI accent */
  --color-ai-accent: #A78BFA;
  --color-ai-surface: rgba(167, 139, 250, 0.08);

  /* Semantic */
  --color-error: #F87171;
  --color-success: #34D399;
  --color-warning: #FBBF24;
  --color-info: #7DD3FC;

  /* Font families */
  --font-sans: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-label: 'Space Grotesk', sans-serif;
}

body {
  background-color: var(--color-background);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
}

/* Custom scrollbar for dark theme */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: var(--color-surface);
}
::-webkit-scrollbar-thumb {
  background: var(--color-border-light);
  border-radius: 3px;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 2: Verify the dev server renders with new colors**

Run: `cd apps/web && npx next dev -p 3002`
Expected: App loads with darker background (#050508), warm coral primary, warm white text

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: update CSS theme tokens to DESIGN.md palette"
```

---

## Task 2: Add Font Loading

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Add font stylesheet links to the HTML head**

```tsx
import type { Metadata } from 'next';
import { CapturesProvider } from '@/contexts/CapturesContext';
import { Sidebar } from '@/components/layout/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'CapSave — AI 캡처 오거나이저',
  description: '스크린샷을 AI가 자동 분석·분류·정리해주는 캡처 오거나이저',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <CapturesProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:ml-60">
              {children}
            </main>
          </div>
        </CapturesProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify fonts load in browser DevTools**

Open http://localhost:3002, inspect a heading element. Computed font-family should show "Pretendard Variable".

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "style: add Pretendard, JetBrains Mono, Space Grotesk font loading"
```

---

## Task 3: Add Map Nav Item to Sidebar

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add the map nav item to the navItems array**

In `apps/web/src/components/layout/Sidebar.tsx`, update the `navItems` array:

```typescript
const navItems = [
  { href: '/', label: '홈', icon: '🏠', description: '전체 캡처' },
  { href: '/places', label: '장소', icon: '📍', description: '맛집·카페·여행지' },
  { href: '/texts', label: '텍스트', icon: '📝', description: 'AI·코드·레시피' },
  { href: '/map', label: '지도', icon: '🗺', description: '저장 장소 지도' },
];
```

- [ ] **Step 2: Verify sidebar shows 4 items and map link navigates to /map**

Open http://localhost:3002, check desktop sidebar and mobile bottom tab bar both show 지도 tab. Clicking it should navigate to `/map` (404 is expected for now).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx
git commit -m "feat: add map nav item to sidebar"
```

---

## Task 4: Redesign CaptureCard with Numbered Place List

**Files:**
- Modify: `apps/web/src/components/captures/CaptureCard.tsx`

- [ ] **Step 1: Rewrite CaptureCard with numbered place list and single map button**

Replace the entire contents of `apps/web/src/components/captures/CaptureCard.tsx`:

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CaptureItem, PlaceInfo } from '@capsave/shared';

interface CaptureCardProps {
  item: CaptureItem;
  onDelete: (id: number) => void;
}

export function CaptureCard({ item, onDelete }: CaptureCardProps) {
  const isPlace = item.category === 'place';
  const accentColor = isPlace ? 'text-place-accent' : 'text-text-accent';
  const surfaceBg = isPlace ? 'bg-place-surface' : 'bg-text-surface';
  const borderColor = isPlace ? 'border-place-border' : 'border-text-border';

  const handleDelete = () => {
    if (confirm('이 캡처를 삭제하시겠습니까?')) {
      onDelete(item.id);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`rounded-3xl overflow-hidden border ${borderColor} bg-surface transition-all duration-200 hover:scale-[1.01] hover:border-border-light`}>
      {/* Image */}
      {item.imageUrl && (
        <div className="relative w-full h-44 bg-surface-elevated">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${surfaceBg} ${accentColor} backdrop-blur-sm`}>
            {isPlace ? `📍 장소 ${item.places.length}개` : '📝 텍스트'}
          </div>
          <button
            onClick={handleDelete}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-text-tertiary hover:text-error transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-4">
        <h3 className="font-bold text-[17px] leading-6 text-text-primary">{item.title}</h3>
        {item.summary && (
          <p className="text-sm text-text-secondary mt-1.5 leading-5 line-clamp-2">{item.summary}</p>
        )}

        {/* Numbered place list */}
        {isPlace && item.places.length > 0 && (
          <div className="mt-3 flex flex-col">
            {item.places.map((place: PlaceInfo, idx: number) => (
              <div
                key={idx}
                className={`flex items-center gap-3 py-2 ${
                  idx < item.places.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-place-accent flex items-center justify-center text-[10px] font-bold text-background flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-text-primary truncate">{place.name}</p>
                  <p className="text-xs text-text-tertiary font-mono truncate">
                    {[place.address, place.date].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            ))}

            {/* Single map button */}
            <Link
              href={`/map?capture=${item.id}`}
              className="mt-3 block w-full py-2.5 rounded-xl bg-place-surface border border-place-border text-center text-sm font-semibold text-place-accent hover:bg-[rgba(52,211,153,0.15)] transition-colors"
            >
              🗺 지도에서 보기
            </Link>
          </div>
        )}

        {/* Links */}
        {item.links.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {item.links.slice(0, 3).map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-text-accent font-mono hover:underline truncate"
              >
                🔗 {link}
              </a>
            ))}
          </div>
        )}

        {/* Tags & date */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="text-xs text-text-tertiary">
                #{tag}
              </span>
            ))}
          </div>
          <span className="text-xs text-text-tertiary">{formatDate(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the card renders correctly**

Open http://localhost:3002. Place cards should show numbered list (1, 2, 3) with place names and a single "🗺 지도에서 보기" button at the bottom. No more 3-button-per-place layout.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/captures/CaptureCard.tsx
git commit -m "feat: redesign CaptureCard with numbered place list and single map button"
```

---

## Task 5: Add lat/lng to PlaceInfo Type

**Files:**
- Modify: `packages/shared/src/types/capture.ts`

- [ ] **Step 1: Add optional lat/lng fields to PlaceInfo**

In `packages/shared/src/types/capture.ts`, update PlaceInfo:

```typescript
export interface PlaceInfo {
  name: string;
  address?: string;
  date?: string;
  links?: string[];
  lat?: number;
  lng?: number;
}
```

- [ ] **Step 2: Rebuild shared package**

Run: `cd packages/shared && npx tsup`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/capture.ts
git commit -m "feat: add lat/lng coordinates to PlaceInfo type"
```

---

## Task 6: Create Geocoding API Route

**Files:**
- Create: `apps/web/src/app/api/geocode/route.ts`

- [ ] **Step 1: Create the geocoding API route**

This route accepts a place name and optional address, returns lat/lng using Google Geocoding API. Server-side to protect API key.

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, address } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const query = address ? `${name} ${address}` : name;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=ko`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return NextResponse.json({ lat, lng, formattedAddress: data.results[0].formatted_address });
    }

    return NextResponse.json({ lat: null, lng: null, formattedAddress: null });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add GOOGLE_MAPS_API_KEY to .env.local**

Add to `apps/web/.env.local`:
```
GOOGLE_MAPS_API_KEY=your_key_here
```

The user will need to get a key from Google Cloud Console with Geocoding API + Maps JavaScript API enabled.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/geocode/route.ts
git commit -m "feat: add server-side geocoding API route"
```

---

## Task 7: Create Map Page Shell

**Files:**
- Create: `apps/web/src/app/map/page.tsx`

- [ ] **Step 1: Create the map page with suspense boundary**

```tsx
'use client';

import { Suspense } from 'react';
import { MapView } from '@/components/map/MapView';

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-0px)] lg:h-screen w-full relative">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">🗺</div>
            <p className="text-text-secondary">지도 로딩 중...</p>
          </div>
        </div>
      }>
        <MapView />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/map/page.tsx
git commit -m "feat: create map page shell with suspense boundary"
```

---

## Task 8: Create MapView Container with Provider Toggle

**Files:**
- Create: `apps/web/src/components/map/MapView.tsx`

- [ ] **Step 1: Create the MapView component**

This component manages which map provider is active, loads places from context, geocodes them, and renders the toggle + map + bottom sheet.

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCaptures } from '@/contexts/CapturesContext';
import { CaptureItem, PlaceInfo } from '@capsave/shared';
import { BottomSheet } from './BottomSheet';
import { PlacePopup } from './PlacePopup';

export interface MapPlace {
  name: string;
  address?: string;
  date?: string;
  lat: number;
  lng: number;
  captureId: number;
  captureTitle: string;
  captureImageUrl: string;
  placeIndex: number;
}

type MapProvider = 'naver' | 'google';

export function MapView() {
  const { captures } = useCaptures();
  const searchParams = useSearchParams();
  const captureFilter = searchParams.get('capture');

  const [provider, setProvider] = useState<MapProvider>('naver');
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter captures that have places
  const placeCaptures = captures.filter(
    (c) => c.category === 'place' && c.places.length > 0
  );

  // Geocode all places
  const geocodePlaces = useCallback(async () => {
    setIsLoading(true);
    const allPlaces: MapPlace[] = [];

    for (const capture of placeCaptures) {
      for (let i = 0; i < capture.places.length; i++) {
        const place = capture.places[i];

        // Skip if already has coordinates
        if (place.lat && place.lng) {
          allPlaces.push({
            name: place.name,
            address: place.address,
            date: place.date,
            lat: place.lat,
            lng: place.lng,
            captureId: capture.id,
            captureTitle: capture.title,
            captureImageUrl: capture.imageUrl,
            placeIndex: i,
          });
          continue;
        }

        // Geocode
        try {
          const res = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: place.name, address: place.address }),
          });
          const data = await res.json();
          if (data.lat && data.lng) {
            allPlaces.push({
              name: place.name,
              address: place.address || data.formattedAddress,
              date: place.date,
              lat: data.lat,
              lng: data.lng,
              captureId: capture.id,
              captureTitle: capture.title,
              captureImageUrl: capture.imageUrl,
              placeIndex: i,
            });
          }
        } catch (err) {
          console.error(`Geocoding failed for ${place.name}:`, err);
        }
      }
    }

    setPlaces(allPlaces);
    setIsLoading(false);
  }, [placeCaptures.length]);

  useEffect(() => {
    if (placeCaptures.length > 0) {
      geocodePlaces();
    } else {
      setIsLoading(false);
    }
  }, [placeCaptures.length]);

  // Filter by capture if query param present
  const filteredPlaces = captureFilter
    ? places.filter((p) => p.captureId === Number(captureFilter))
    : places;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📍</div>
          <p className="text-text-secondary">장소 좌표를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (filteredPlaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">🗺</div>
          <p className="text-text-primary font-semibold">저장된 장소가 없습니다</p>
          <p className="text-text-tertiary text-sm mt-1">장소 캡처를 추가하면 지도에 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Top bar: Provider toggle + filters */}
      <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-center">
        {/* Map provider toggle */}
        <div className="flex bg-black/75 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10">
          <button
            onClick={() => setProvider('naver')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              provider === 'naver'
                ? 'text-place-accent bg-[rgba(52,211,153,0.15)]'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            네이버
          </button>
          <button
            onClick={() => setProvider('google')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              provider === 'google'
                ? 'text-place-accent bg-[rgba(52,211,153,0.15)]'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            구글
          </button>
        </div>

        {/* Place count */}
        <div className="px-3 py-2 bg-black/75 backdrop-blur-xl rounded-xl border border-white/10 text-xs text-place-accent font-semibold">
          📍 {filteredPlaces.length}개 장소
        </div>
      </div>

      {/* Map */}
      <div className="h-full w-full bg-surface">
        {provider === 'naver' ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            네이버맵 (NAVER_MAPS_CLIENT_ID 설정 필요)
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            구글맵 (GOOGLE_MAPS_API_KEY 설정 필요)
          </div>
        )}
      </div>

      {/* Place popup */}
      {selectedPlace && (
        <PlacePopup
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {/* Bottom sheet */}
      <BottomSheet
        places={filteredPlaces}
        onPlaceSelect={(place) => setSelectedPlace(place)}
        selectedPlace={selectedPlace}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/map/MapView.tsx
git commit -m "feat: create MapView container with provider toggle and geocoding"
```

---

## Task 9: Create BottomSheet Component

**Files:**
- Create: `apps/web/src/components/map/BottomSheet.tsx`

- [ ] **Step 1: Create the bottom sheet with horizontal scrolling place cards**

```tsx
'use client';

import { useRef, useEffect } from 'react';
import { MapPlace } from './MapView';

interface BottomSheetProps {
  places: MapPlace[];
  onPlaceSelect: (place: MapPlace) => void;
  selectedPlace: MapPlace | null;
}

export function BottomSheet({ places, onPlaceSelect, selectedPlace }: BottomSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to selected place card
  useEffect(() => {
    if (selectedPlace && scrollRef.current) {
      const idx = places.findIndex(
        (p) => p.name === selectedPlace.name && p.captureId === selectedPlace.captureId
      );
      if (idx >= 0) {
        const card = scrollRef.current.children[idx] as HTMLElement;
        card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedPlace, places]);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-2xl z-10 pb-safe">
      {/* Handle bar */}
      <div className="flex justify-center py-2">
        <div className="w-9 h-1 bg-border-light rounded-full" />
      </div>

      {/* Horizontal scroll cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {places.map((place, idx) => {
          const isSelected =
            selectedPlace?.name === place.name &&
            selectedPlace?.captureId === place.captureId;

          return (
            <button
              key={`${place.captureId}-${place.placeIndex}`}
              onClick={() => onPlaceSelect(place)}
              className={`flex-shrink-0 w-44 p-3 rounded-xl text-left transition-all ${
                isSelected
                  ? 'bg-place-surface border border-place-border'
                  : 'bg-surface-elevated border border-border hover:border-border-light'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-place-accent flex items-center justify-center text-[10px] font-bold text-background flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="font-semibold text-xs text-text-primary truncate">
                  {place.name}
                </span>
              </div>
              <p className="text-[10px] text-text-tertiary mt-1.5 truncate font-mono">
                {place.address || ''}
              </p>
              <p className="text-[10px] text-text-tertiary mt-0.5 truncate">
                📸 {place.captureTitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/map/BottomSheet.tsx
git commit -m "feat: create BottomSheet component with horizontal place cards"
```

---

## Task 10: Create PlacePopup Component

**Files:**
- Create: `apps/web/src/components/map/PlacePopup.tsx`

- [ ] **Step 1: Create the pin popup with place details and action buttons**

```tsx
'use client';

import Link from 'next/link';
import { MapPlace } from './MapView';

interface PlacePopupProps {
  place: MapPlace;
  onClose: () => void;
}

export function PlacePopup({ place, onClose }: PlacePopupProps) {
  const naverSearchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`;
  const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    place.name + (place.address ? ` ${place.address}` : '')
  )}`;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-64 bg-surface-elevated border border-border rounded-2xl p-4 shadow-2xl shadow-black/50">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-text-tertiary hover:text-text-primary text-sm"
      >
        ✕
      </button>

      {/* Place info */}
      <p className="font-bold text-sm text-place-accent">{place.name}</p>
      {place.address && (
        <p className="text-xs text-text-tertiary font-mono mt-1">{place.address}</p>
      )}
      {place.date && (
        <p className="text-xs text-text-tertiary mt-0.5">{place.date}</p>
      )}
      <p className="text-[10px] text-text-tertiary mt-2 pt-2 border-t border-border">
        📸 {place.captureTitle}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <a
          href={naverSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 rounded-lg bg-place-surface text-center text-xs font-semibold text-place-accent hover:bg-[rgba(52,211,153,0.15)] transition-colors"
        >
          길찾기
        </a>
        <Link
          href={`/?highlight=${place.captureId}`}
          className="flex-1 py-2 rounded-lg bg-surface text-center text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          캡처 보기
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/map/PlacePopup.tsx
git commit -m "feat: create PlacePopup component with place details and actions"
```

---

## Task 11: Verify Full Flow and Final Commit

- [ ] **Step 1: Verify design system changes**

Open http://localhost:3002 and check:
- Background is #050508 (very dark with slight blue tint)
- Primary color is Warm Coral (#F4845F) on buttons and branding
- Text is warm white (#E8D5B7)
- Fonts: Pretendard for Korean text, monospace for URLs/addresses

- [ ] **Step 2: Verify capture card redesign**

Check place capture cards show:
- Numbered list (1, 2, 3) with place names
- Single "🗺 지도에서 보기" button at bottom
- No more 3-map-button-per-place layout

- [ ] **Step 3: Verify map page**

Navigate to /map via sidebar:
- Provider toggle (네이버/구글) appears
- Place count badge shows
- Bottom sheet with horizontal scrolling place cards
- Popup appears when clicking a card in the bottom sheet

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Rebuild shared package**

Run: `cd packages/shared && npx tsup`
Expected: Build succeeds

- [ ] **Step 6: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: complete design system update and map view implementation"
```

---

## Notes for Implementation

### Map API Keys Required
The user needs to obtain and add these to `apps/web/.env.local`:
- `GOOGLE_MAPS_API_KEY` — Google Cloud Console, enable Geocoding API + Maps JavaScript API
- `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` — Naver Cloud Platform, Maps API
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Same Google key but exposed to client for map rendering

### Actual Map Rendering (Phase 2)
Tasks 8-10 create the UI shell with toggle, bottom sheet, and popup. The actual Naver/Google map rendering components (`NaverMap.tsx`, `GoogleMap.tsx`) will need the API keys to be configured first. The placeholder text in MapView shows where the map components will be plugged in. This can be done as a follow-up once API keys are available.

### Geocoding Caching (Future)
Currently geocoding happens on every page load. A future optimization is to cache lat/lng in the Supabase `places` JSONB after first geocode, so subsequent loads skip the API call.
