# Wave 2: UX & Design Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 업로드/분석 병렬화, 에러 피드백 시스템 구축, 키보드 접근성 추가, 이모지를 SVG 아이콘으로 교체, 컬러 대비 보정, 폰트 로딩 최적화, 검색 빈 상태, 이미지 lazy loading을 구현한다.

**Architecture:** 웹에서 `notifications.ts`(기존 toast 시스템)를 모든 에러 경로에 연결한다. `useModalFocusTrap` 커스텀 훅으로 모달 포커스를 가두고 ESC 키 닫기를 추가한다. `lucide-react`를 웹에, `lucide-react-native`를 모바일에 설치해 이모지를 교체한다.

**Tech Stack:** lucide-react, lucide-react-native, React hooks (useEffect, useRef), CSS focus-visible, Tailwind CSS

---

## File Map

### 새로 생성
- `apps/web/src/hooks/useModalFocusTrap.ts` — 포커스 트랩 + ESC 키 훅

### 수정
- `apps/web/src/app/globals.css` — focus-visible, text-tertiary 색상
- `apps/web/src/app/layout.tsx` — 폰트 link 태그 font-display
- `apps/web/src/contexts/CapturesContext.tsx` — 에러 시 toast 호출
- `apps/web/src/contexts/GuestCapturesContext.tsx` — 에러 시 toast 호출
- `apps/web/src/components/upload/AnalyzeModal.tsx` — 포커스 트랩 + ESC
- `apps/web/src/components/upload/BatchAnalyzeModal.tsx` — 포커스 트랩 + ESC
- `apps/web/src/components/map/PlacePopup.tsx` — 포커스 트랩 + ESC
- `apps/web/src/components/layout/Sidebar.tsx` — 이모지 → lucide 아이콘
- `apps/web/src/components/captures/CaptureList.tsx` — 빈 상태 아이콘 + 검색 빈 상태
- `apps/web/src/components/captures/CaptureCard.tsx` — lazy loading
- `apps/web/src/app/(app)/map/page.tsx` — 지오코딩 실패 toast
- `apps/mobile/app/(tabs)/_layout.tsx` — Ionicons → lucide 탭 아이콘
- `apps/mobile/contexts/CapturesContext.tsx` — 에러 시 Alert

---

## Task 6: F5 — 업로드/분석 병렬 처리

**배경:** 현재 이미지 업로드 후 분석 API를 순차 호출해 두 번의 네트워크 왕복이 발생. 병렬로 동시 실행해 체감 속도를 개선한다.

**Files:**
- Modify: `apps/web/src/components/upload/AnalyzeModal.tsx`
- Modify: `apps/web/src/components/upload/BatchAnalyzeModal.tsx`

- [ ] **Step 6.1: AnalyzeModal — 업로드와 분석 병렬화**

`apps/web/src/components/upload/AnalyzeModal.tsx`에서 `runAnalysis` 함수 내 순차 처리를 `Promise.all`로 병렬화:

```typescript
// 기존 (순차):
const uploadResult = await uploadImage(file);
const analysisResult = await analyzeImage(resizedBase64);

// 수정 (병렬):
const [uploadResult, analysisResult] = await Promise.all([
  // 1. 원본 이미지 Storage 업로드
  isGuest ? Promise.resolve(null) : uploadImageToServer(file),
  // 2. 리사이즈된 base64로 AI 분석
  analyzeImageWithAI(resizedBase64),
]);

// uploadImageToServer: FormData POST /api/upload → { path }
async function uploadImageToServer(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) return null;
  const { path } = await res.json();
  return path; // 'user_id/timestamp_random.jpg'
}

// analyzeImageWithAI: base64 POST /api/analyze → AnalysisResult
async function analyzeImageWithAI(base64: string): Promise<AnalysisResult> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });
  if (!res.ok) throw new Error('분석에 실패했습니다');
  return res.json();
}

// 저장 시 uploadResult(path)가 있으면 imageUrl로 사용, 없으면 base64 사용
const imageUrlForSave = uploadResult ?? resizedBase64;
onSave(analysisResult, imageUrlForSave);
```

- [ ] **Step 6.2: TypeScript 체크**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -10
```

Expected: 오류 없음

- [ ] **Step 6.3: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/web/src/components/upload/AnalyzeModal.tsx
git commit -m "perf: parallelize image upload and AI analysis for faster capture flow"
```

---

## Task 7: F7 — 에러 사용자 피드백

**배경:** Context의 catch 블록이 `console.error()`만 호출해 사용자는 실패를 모른다. 웹은 기존 `notifications.ts`의 toast를, 모바일은 `Alert.alert()`을 사용한다.

**Files:**
- Modify: `apps/web/src/contexts/CapturesContext.tsx`
- Modify: `apps/web/src/contexts/GuestCapturesContext.tsx`
- Modify: `apps/web/src/app/api/analyze/route.ts` (rate limit 메시지 개선)
- Modify: `apps/mobile/contexts/CapturesContext.tsx`

- [ ] **Step 6.1: 웹 CapturesContext — 에러 toast 추가**

`apps/web/src/contexts/CapturesContext.tsx`에서 toast import 추가:

```typescript
import { showErrorToast } from '@/lib/notifications';
```

각 catch 블록 수정:

```typescript
// refresh 함수
} catch (error) {
  console.error('Failed to load captures:', error);
  showErrorToast('캡처를 불러오지 못했습니다. 새로고침해주세요.');
}

// deleteCapture 함수
} catch (error) {
  console.error('Failed to delete capture:', error);
  showErrorToast('삭제에 실패했습니다. 다시 시도해주세요.');
}

// saveCapture 함수
} catch (error) {
  console.error('Failed to save capture:', error);
  showErrorToast('저장에 실패했습니다. 다시 시도해주세요.');
  throw error; // 호출자가 에러를 알 수 있도록 re-throw
}
```

- [ ] **Step 6.2: notifications.ts 함수 확인 및 보완**

```bash
cat apps/web/src/lib/notifications.ts
```

`showErrorToast`, `showSuccessToast` 함수가 없으면 추가:

```typescript
// apps/web/src/lib/notifications.ts에 추가
export function showErrorToast(message: string) {
  // 기존 toast 함수 래핑. 없으면 새로 구현:
  if (typeof window === 'undefined') return;
  // 간단한 구현: document에 토스트 요소 추가
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #F87171; color: #000; padding: 12px 20px;
    border-radius: 12px; font-size: 14px; font-weight: 500;
    z-index: 9999; animation: slide-up 0.2s ease-out;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
```

> **참고:** 기존 `notifications.ts`에 이미 구현된 함수가 있으면 그것을 사용. 중복 구현하지 않는다.

- [ ] **Step 6.3: rate limit API 응답에 남은 횟수 포함**

`apps/web/src/app/api/analyze/route.ts`에서 429 응답 수정:

```typescript
// 기존:
return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

// 수정: remaining 정보 포함
return NextResponse.json(
  { error: '오늘 무료 분석 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.', remaining: 0, limit: 5 },
  { status: 429 }
);
```

- [ ] **Step 6.4: 모바일 CapturesContext — Alert 에러 피드백**

`apps/mobile/contexts/CapturesContext.tsx`에서 import 추가:

```typescript
import { Alert } from 'react-native';
```

catch 블록 수정:

```typescript
// 삭제 실패
} catch (error) {
  console.error('[CapturesContext] Delete failed:', error);
  Alert.alert('삭제 실패', '다시 시도해주세요.');
}

// 저장 실패
} catch (error) {
  console.error('[CapturesContext] Save failed:', error);
  Alert.alert('저장 실패', '이미지 저장에 실패했습니다. 네트워크를 확인해주세요.');
  throw error;
}
```

- [ ] **Step 6.5: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/web/src/contexts/CapturesContext.tsx apps/web/src/contexts/GuestCapturesContext.tsx apps/web/src/lib/notifications.ts apps/web/src/app/api/analyze/route.ts apps/mobile/contexts/CapturesContext.tsx
git commit -m "feat: add user-facing error feedback via toast (web) and Alert (mobile)"
```

---

## Task 7: U1+U2+U3 — 키보드 접근성

**배경:** 버튼/카드에 focus-visible 표시가 없고, 모달에서 Tab 키가 외부로 빠져나가며, ESC 키로 닫을 수 없다.

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Create: `apps/web/src/hooks/useModalFocusTrap.ts`
- Modify: `apps/web/src/components/upload/AnalyzeModal.tsx`
- Modify: `apps/web/src/components/upload/BatchAnalyzeModal.tsx`
- Modify: `apps/web/src/components/map/PlacePopup.tsx`

- [ ] **Step 7.1: globals.css에 focus-visible 스타일 추가**

`apps/web/src/app/globals.css`에서 `@layer base` 또는 최상단에 추가:

```css
/* Keyboard focus indicator — WCAG 2.1 AA */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* 기존 :focus outline 제거 (마우스 클릭 시 불필요한 ring 방지) */
:focus:not(:focus-visible) {
  outline: none;
}
```

- [ ] **Step 7.2: useModalFocusTrap 훅 생성**

새 파일 `apps/web/src/hooks/useModalFocusTrap.ts`:

```typescript
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * 모달 포커스 트랩 훅.
 * - Tab/Shift+Tab이 모달 내부에서만 순환한다.
 * - ESC 키로 모달을 닫는다.
 * - 모달 열릴 때 첫 번째 포커스 가능 요소에 포커스를 준다.
 */
export function useModalFocusTrap(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // 첫 번째 포커스 가능 요소에 포커스
    const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;
      if (!containerRef.current) return;

      const focusableEls = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      );
      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return containerRef;
}
```

- [ ] **Step 7.3: AnalyzeModal에 포커스 트랩 적용**

`apps/web/src/components/upload/AnalyzeModal.tsx`에서:

```typescript
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

// 컴포넌트 내부:
const containerRef = useModalFocusTrap(true, onCancel);

// 모달 최상위 div에 ref 연결:
<div
  ref={containerRef}
  className="fixed inset-0 z-50 ..."
  role="dialog"
  aria-modal="true"
  aria-label="AI 분석 결과"
>
```

- [ ] **Step 7.4: BatchAnalyzeModal에 동일하게 적용**

`apps/web/src/components/upload/BatchAnalyzeModal.tsx`에서 동일한 패턴:

```typescript
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

const containerRef = useModalFocusTrap(true, onCancel);

<div ref={containerRef} className="fixed inset-0 z-50 ..." role="dialog" aria-modal="true" aria-label="통합 분석 결과">
```

- [ ] **Step 7.5: PlacePopup에 동일하게 적용**

`apps/web/src/components/map/PlacePopup.tsx`에서 동일한 패턴 (닫기 함수를 onClose prop으로 받고 있을 경우):

```typescript
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

// props에서 onClose 받아오기
const containerRef = useModalFocusTrap(!!place, onClose);
```

- [ ] **Step 7.6: TypeScript 체크**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 7.7: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/web/src/app/globals.css apps/web/src/hooks/useModalFocusTrap.ts apps/web/src/components/upload/AnalyzeModal.tsx apps/web/src/components/upload/BatchAnalyzeModal.tsx apps/web/src/components/map/PlacePopup.tsx
git commit -m "feat: keyboard accessibility — focus-visible, focus trap, ESC to close modals"
```

---

## Task 8: U4 — 컬러 대비 보정

**배경:** Text-Tertiary `#5A5A65`가 Surface `#0D0D12` 위에서 약 2.8:1 대비비 — WCAG AA의 4.5:1에 미달.

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `DESIGN.md`

- [ ] **Step 8.1: globals.css text-tertiary 값 수정**

`apps/web/src/app/globals.css`에서 `--color-text-tertiary` 변수 수정:

```css
/* 기존: */
--color-text-tertiary: #5A5A65;

/* 수정: #8A8A95 → Surface 위에서 약 5.2:1 (AA 충족) */
--color-text-tertiary: #8A8A95;
```

- [ ] **Step 8.2: DESIGN.md 업데이트**

`DESIGN.md`에서 Text Tertiary 색상 값을 `#5A5A65` → `#8A8A95`로 수정하고 이유 주석 추가.

- [ ] **Step 8.3: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/web/src/app/globals.css DESIGN.md
git commit -m "fix: raise text-tertiary contrast to #8A8A95 for WCAG AA compliance"
```

---

## Task 9: U5+U6+U7 — 검색 빈 상태, lazy loading, 지오코딩 피드백

**Files:**
- Modify: `apps/web/src/components/captures/CaptureList.tsx`
- Modify: `apps/web/src/components/captures/CaptureCard.tsx`
- Modify: `apps/web/src/app/(app)/map/page.tsx`

- [ ] **Step 9.1: CaptureList — 검색 빈 상태 분기 추가**

`apps/web/src/components/captures/CaptureList.tsx`에서 빈 상태 렌더링 부분을 수정.

검색어가 있는 경우와 없는 경우를 분리:

```typescript
// props에서 searchQuery를 받거나 SearchBar를 통해 알 수 있어야 함
// CaptureList가 검색 결과를 받는 구조라면:

if (items.length === 0) {
  if (searchQuery && searchQuery.trim().length > 0) {
    // 검색 결과 없음
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
          <Search className="w-7 h-7 text-text-tertiary" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">
          &ldquo;{searchQuery}&rdquo;에 대한 결과가 없습니다
        </h3>
        <p className="text-sm text-text-secondary">다른 키워드로 검색해보세요</p>
      </div>
    );
  }

  // 일반 빈 상태 (기존 emptyIcon/emptyTitle/emptySubtitle 사용)
  return (/* 기존 빈 상태 UI */);
}
```

> **참고:** `Search` 아이콘은 Task 10에서 lucide-react를 설치한 후 import 가능. 이 태스크는 Task 10 이후에 실행하거나, 임시로 `🔍` 이모지를 사용하고 Task 10에서 교체.

- [ ] **Step 9.2: CaptureCard — 이미지 lazy loading 적용**

`apps/web/src/components/captures/CaptureCard.tsx`에서 이미지 렌더링 수정.

카드 index를 prop으로 받아 첫 6개만 eager:

```typescript
// CaptureCard props에 priority 추가 (선택적)
interface CaptureCardProps {
  item: CaptureItem;
  priority?: boolean; // true면 eager loading
  // ... 기존 props
}

// 이미지에 적용:
<img
  src={`/api/image?path=${encodeURIComponent(item.imageUrl)}`}
  alt={item.title}
  className="w-full h-full object-cover"
  loading={priority ? 'eager' : 'lazy'}
/>
```

CaptureList에서 첫 6개에 priority 전달:

```typescript
{items.map((item, idx) => (
  <CaptureCard key={item.id} item={item} priority={idx < 6} />
))}
```

- [ ] **Step 9.3: 지오코딩 실패 toast 추가**

`apps/web/src/app/(app)/map/page.tsx`에서 장소 좌표 조회 실패 시 toast:

```typescript
import { showErrorToast } from '@/lib/notifications';

// 지오코딩 실패 처리 부분:
const placesWithCoords = await Promise.all(
  places.map(async (place) => {
    try {
      const coords = await geocodePlace(place.name, place.address);
      return coords ? { ...place, ...coords } : null;
    } catch {
      return null;
    }
  })
);

const failedCount = placesWithCoords.filter(Boolean).length < places.length
  ? places.length - placesWithCoords.filter(Boolean).length
  : 0;

if (failedCount > 0) {
  showErrorToast(`${failedCount}개 장소의 위치를 찾을 수 없습니다`);
}
```

- [ ] **Step 9.4: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/web/src/components/captures/CaptureList.tsx apps/web/src/components/captures/CaptureCard.tsx apps/web/src/app/\(app\)/map/page.tsx
git commit -m "feat: search empty state, lazy image loading, geocoding failure feedback"
```

---

## Task 10: D3 — 이모지 → lucide SVG 아이콘

**배경:** 이모지는 플랫폼/OS마다 렌더링이 다르고 크기 조정이 어렵다. lucide 아이콘으로 교체해 일관성을 높인다.

**Files:**
- Modify: `apps/web/package.json` (lucide-react 설치)
- Modify: `apps/mobile/package.json` (lucide-react-native 설치)
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/components/captures/CaptureList.tsx`
- Modify: `apps/web/src/components/upload/AnalyzeModal.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 10.1: lucide-react 설치 (웹)**

```bash
cd apps/web && npm install lucide-react
```

- [ ] **Step 10.2: lucide-react-native 설치 (모바일)**

```bash
cd apps/mobile && npm install lucide-react-native react-native-svg
```

- [ ] **Step 10.3: 웹 Sidebar — 이모지 → 아이콘**

`apps/web/src/components/layout/Sidebar.tsx`에서:

```typescript
import { Home, MapPin, FileText, Map, Settings, LogOut, Camera } from 'lucide-react';

// nav items 정의 수정:
const navItems = [
  { href: '/dashboard', icon: Home, label: '홈' },
  { href: '/places', icon: MapPin, label: '장소' },
  { href: '/texts', icon: FileText, label: '텍스트' },
  { href: '/map', icon: Map, label: '지도' },
];

// 렌더링:
{navItems.map(({ href, icon: Icon, label }) => (
  <Link key={href} href={href} className={`... flex items-center gap-3 ...`}>
    <Icon size={18} />
    <span className="hidden lg:block">{label}</span>
  </Link>
))}

// 모바일 탭바에서도 동일하게 icon 교체
```

- [ ] **Step 10.4: CaptureList 빈 상태 이모지 → 아이콘**

`apps/web/src/components/captures/CaptureList.tsx`에서:

```typescript
import { Camera, MapPin, FileText, Map } from 'lucide-react';

// 빈 상태 아이콘 매핑:
const categoryIconMap = {
  place: MapPin,
  text: FileText,
  all: Camera,
};

// 빈 상태 렌더링:
const EmptyIcon = categoryIconMap[category] ?? Camera;
<div className="w-24 h-24 rounded-full bg-surface-elevated flex items-center justify-center mb-5">
  <EmptyIcon size={40} className="text-text-tertiary" />
</div>
```

- [ ] **Step 10.5: AnalyzeModal 로딩 이모지 → 아이콘**

`apps/web/src/components/upload/AnalyzeModal.tsx`에서 로딩 상태:

```typescript
import { Bot } from 'lucide-react';

// 기존: <div className="text-4xl mb-4 animate-bounce">🤖</div>
// 수정:
<div className="w-16 h-16 mb-4 rounded-full bg-ai-surface flex items-center justify-center animate-pulse">
  <Bot size={28} className="text-ai-accent" />
</div>
```

- [ ] **Step 10.6: 모바일 탭바 — Ionicons → lucide-react-native**

`apps/mobile/app/(tabs)/_layout.tsx`에서:

```typescript
import { Home, MapPin, FileText } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

// tabBarIcon 수정:
<Tabs.Screen
  name="index"
  options={{
    title: '홈',
    tabBarIcon: ({ focused }) => (
      <Home
        size={22}
        color={focused ? colors.primary : colors.tabIconDefault}
        strokeWidth={focused ? 2.5 : 1.8}
      />
    ),
  }}
/>
<Tabs.Screen
  name="places"
  options={{
    title: '장소',
    tabBarIcon: ({ focused }) => (
      <MapPin
        size={22}
        color={focused ? colors.primary : colors.tabIconDefault}
        strokeWidth={focused ? 2.5 : 1.8}
      />
    ),
  }}
/>
<Tabs.Screen
  name="texts"
  options={{
    title: '텍스트',
    tabBarIcon: ({ focused }) => (
      <FileText
        size={22}
        color={focused ? colors.primary : colors.tabIconDefault}
        strokeWidth={focused ? 2.5 : 1.8}
      />
    ),
  }}
/>
```

- [ ] **Step 10.7: TypeScript 체크 (web + mobile)**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -10
cd apps/mobile && npx tsc --noEmit 2>&1 | head -10
```

Expected: 오류 없음

- [ ] **Step 10.8: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/web/package.json apps/mobile/package.json apps/web/src/components/layout/Sidebar.tsx apps/web/src/components/captures/CaptureList.tsx apps/web/src/components/upload/AnalyzeModal.tsx apps/mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat: replace emoji icons with lucide-react SVG icons across web and mobile"
```

---

## Task 11: D5 — 폰트 로딩 최적화

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 11.1: layout.tsx 폰트 link에 display=swap 추가**

`apps/web/src/app/layout.tsx`에서 Google Fonts link:

```tsx
// 기존:
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono...&family=Space+Grotesk..." rel="stylesheet" />

// 수정: &display=swap 추가
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet" />
```

- [ ] **Step 11.2: globals.css font-family fallback 체인 추가**

`apps/web/src/app/globals.css`에서 body font-family:

```css
:root {
  --font-sans: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --font-label: 'Space Grotesk', 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 11.3: 커밋**

```bash
cd /Users/ssongji/Developer/Workspace/scrave
git add apps/web/src/app/layout.tsx apps/web/src/app/globals.css
git commit -m "perf: add font-display:swap and system font fallbacks for faster rendering"
```

---

## Wave 2 완료 체크리스트

```
[ ] Task 6: F7 — 에러 toast/Alert 피드백 (커밋 완료)
[ ] Task 7: U1+U2+U3 — 키보드 접근성 + 포커스 트랩 (커밋 완료)
[ ] Task 8: U4 — text-tertiary 대비 보정 (커밋 완료)
[ ] Task 9: U5+U6+U7 — 검색 빈 상태, lazy loading, 지오코딩 toast (커밋 완료)
[ ] Task 10: D3 — 이모지 → lucide SVG 아이콘 (커밋 완료)
[ ] Task 11: D5 — 폰트 로딩 최적화 (커밋 완료)
```

성공 기준:
- 삭제/저장/로드 실패 시 toast 또는 Alert가 표시됨
- Tab 키가 모달 내부에서만 순환함
- ESC 키로 모달이 닫힘
- 버튼 포커스 시 coral outline이 표시됨
- 이모지 대신 lucide 아이콘이 표시됨
- 검색 결과가 0개일 때 전용 메시지가 표시됨
