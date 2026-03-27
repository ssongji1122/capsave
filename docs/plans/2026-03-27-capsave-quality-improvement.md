# CapSave Quality Improvement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical security issues, eliminate code duplication, improve performance, and establish testing infrastructure for the CapSave app.

**Architecture:** Client-side Expo React Native app with SQLite storage and OpenAI Vision API integration. Improvements are layered: security hardening first, then DRY refactoring, performance optimization, and finally architecture/testing. A backend proxy for API keys is noted as a separate future project — this plan focuses on what can be done client-side immediately.

**Tech Stack:** Expo 55, React Native 0.83, TypeScript 5.9, expo-sqlite, expo-image-picker, OpenAI Vision API

---

## Phase 1: Security Hardening

### Task 1: URL Scheme Validation

**Files:**
- Create: `services/url-validator.ts`
- Modify: `services/map-linker.ts:78-89`
- Create: `services/__tests__/url-validator.test.ts`

**Why:** AI-generated links from OpenAI are opened via `Linking.openURL()` without validation. Malicious or hallucinated URLs could trigger `tel:`, `sms:`, `mailto:` deep links.

**Step 1: Set up Jest testing infrastructure**

Install dependencies:
```bash
npx expo install jest-expo @types/jest -- --dev
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
    ]
  }
}
```

**Step 2: Write the failing test**

Create `services/__tests__/url-validator.test.ts`:
```typescript
import { isUrlSafe, sanitizeUrl } from '../url-validator';

describe('isUrlSafe', () => {
  it('allows https URLs', () => {
    expect(isUrlSafe('https://www.google.com')).toBe(true);
  });

  it('allows http URLs', () => {
    expect(isUrlSafe('http://example.com')).toBe(true);
  });

  it('allows naver map deep links', () => {
    expect(isUrlSafe('nmap://search?query=test')).toBe(true);
  });

  it('allows google maps deep links', () => {
    expect(isUrlSafe('comgooglemaps://?q=test')).toBe(true);
  });

  it('allows kakao map deep links', () => {
    expect(isUrlSafe('kakaomap://search?q=test')).toBe(true);
  });

  it('allows geo: scheme', () => {
    expect(isUrlSafe('geo:0,0?q=test')).toBe(true);
  });

  it('blocks tel: scheme', () => {
    expect(isUrlSafe('tel:+1234567890')).toBe(false);
  });

  it('blocks sms: scheme', () => {
    expect(isUrlSafe('sms:+1234567890')).toBe(false);
  });

  it('blocks mailto: scheme', () => {
    expect(isUrlSafe('mailto:test@test.com')).toBe(false);
  });

  it('blocks javascript: scheme', () => {
    expect(isUrlSafe('javascript:alert(1)')).toBe(false);
  });

  it('blocks empty strings', () => {
    expect(isUrlSafe('')).toBe(false);
  });

  it('blocks strings without scheme', () => {
    expect(isUrlSafe('not-a-url')).toBe(false);
  });
});

describe('sanitizeUrl', () => {
  it('returns the URL if safe', () => {
    expect(sanitizeUrl('https://google.com')).toBe('https://google.com');
  });

  it('returns null if unsafe', () => {
    expect(sanitizeUrl('tel:123')).toBeNull();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx jest services/__tests__/url-validator.test.ts --no-cache`
Expected: FAIL with "Cannot find module '../url-validator'"

**Step 4: Write minimal implementation**

Create `services/url-validator.ts`:
```typescript
const ALLOWED_SCHEMES = [
  'https:',
  'http:',
  'nmap:',
  'comgooglemaps:',
  'kakaomap:',
  'geo:',
];

export function isUrlSafe(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  const lower = url.toLowerCase().trim();

  return ALLOWED_SCHEMES.some((scheme) => {
    // geo: uses a different format (geo:0,0?q=...)
    if (scheme === 'geo:') return lower.startsWith('geo:');
    return lower.startsWith(scheme);
  });
}

export function sanitizeUrl(url: string): string | null {
  return isUrlSafe(url) ? url : null;
}
```

**Step 5: Run test to verify it passes**

Run: `npx jest services/__tests__/url-validator.test.ts --no-cache`
Expected: All tests PASS

**Step 6: Integrate into map-linker**

Modify `services/map-linker.ts` — update the `openUrl` function:
```typescript
// Add import at top:
import { isUrlSafe } from './url-validator';

// Replace the openUrl function (lines 78-89):
export async function openUrl(url: string): Promise<void> {
  if (!isUrlSafe(url)) {
    Alert.alert('안전하지 않은 링크', '이 링크는 열 수 없습니다.');
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('오류', '해당 링크를 열 수 없습니다.');
    }
  } catch {
    Alert.alert('오류', '링크를 여는 중 오류가 발생했습니다.');
  }
}
```

**Step 7: Run all tests**

Run: `npx jest --no-cache`
Expected: PASS

**Step 8: Commit**

```bash
git add services/url-validator.ts services/__tests__/url-validator.test.ts services/map-linker.ts package.json
git commit -m "feat: add URL scheme validation to prevent unsafe deep links"
```

---

### Task 2: Debounce on Retry / Analyze

**Files:**
- Modify: `app/capture/analyze.tsx:66-76`
- Modify: `app/capture/analyze.tsx:146-153`

**Why:** Users can spam the retry button to make unlimited OpenAI API calls, causing unexpected billing.

**Step 1: Add debounce guard to analysis**

Modify `app/capture/analyze.tsx`:

Add a ref to track in-flight requests (near existing refs around line 35):
```typescript
const isAnalyzing = useRef(false);
```

Update `runAnalysis` function (lines 66-76):
```typescript
const runAnalysis = async () => {
  if (isAnalyzing.current) return;
  isAnalyzing.current = true;
  setStatus('analyzing');
  try {
    const analysisResult = await analyzeImage(imageUri!);
    setResult(analysisResult);
    setStatus('done');
  } catch (error: any) {
    setErrorMessage(error.message || '분석 중 오류가 발생했습니다.');
    setStatus('error');
  } finally {
    isAnalyzing.current = false;
  }
};
```

**Step 2: Disable retry button during analysis**

The retry button (line 146-153) should already be unreachable during analysis (it only shows when `status === 'error'`), but `runAnalysis` now self-guards with `isAnalyzing.current`. No additional UI change needed.

**Step 3: Verify manually**

Run: `npx expo start`
- Select an image, verify analysis works
- On error, tap retry rapidly — should not send duplicate requests

**Step 4: Commit**

```bash
git add app/capture/analyze.tsx
git commit -m "fix: prevent duplicate API calls with in-flight guard"
```

---

### Task 3: API Key Security Documentation

**Files:**
- Create: `docs/SECURITY.md`

**Why:** The OpenAI API key is bundled in the client. A full backend proxy is out of scope for this plan, but the risk must be documented.

**Step 1: Create security documentation**

Create `docs/SECURITY.md`:
```markdown
# Security Notes

## API Key Exposure (Known Issue)

The OpenAI API key is currently stored in `app.json > extra.openaiApiKey` and bundled into the client binary. This is a known security risk.

### Current Risk
- Anyone with the app binary can extract the API key
- Unauthorized usage could cause unexpected billing

### Recommended Fix (Future)
- Create a backend proxy (e.g., Cloudflare Worker, Vercel Edge Function)
- Client sends image to proxy → proxy calls OpenAI with server-side key
- Add rate limiting and authentication to the proxy

### Interim Mitigation
- Set strict usage limits on the OpenAI API key via the OpenAI dashboard
- Monitor API usage for anomalies
- Rotate the key regularly
```

**Step 2: Commit**

```bash
git add docs/SECURITY.md
git commit -m "docs: document API key exposure risk and mitigation plan"
```

---

## Phase 2: Quality & DRY

### Task 4: Extract Shared CategoryScreen Component

**Files:**
- Create: `components/CategoryScreen.tsx`
- Modify: `app/(tabs)/places.tsx` (rewrite)
- Modify: `app/(tabs)/texts.tsx` (rewrite)

**Why:** `places.tsx` and `texts.tsx` are 95%+ identical. Only the category, accent color, icon, and empty state text differ.

**Step 1: Create the shared component**

Create `components/CategoryScreen.tsx`:
```typescript
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CaptureItem, getCapturesByCategory, deleteCapture } from '@/services/database';
import { CaptureCard } from '@/components/CaptureCard';
import { CaptureCategory } from '@/services/ai-analyzer';

interface CategoryScreenProps {
  category: CaptureCategory;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyTitle: string;
  emptySubtitle: string;
}

export function CategoryScreen({
  category,
  title,
  icon,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
}: CategoryScreenProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const isPlace = category === 'place';
  const accentColor = isPlace ? colors.placeAccent : colors.textAccent;
  const surfaceColor = isPlace ? colors.placeSurface : colors.textSurface;

  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCaptures = useCallback(async () => {
    try {
      const items = await getCapturesByCategory(category);
      setCaptures(items);
    } catch (error) {
      console.error(`Failed to load ${category}:`, error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      loadCaptures();
    }, [loadCaptures])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCaptures();
  };

  const handleDelete = async (id: number) => {
    await deleteCapture(id);
    loadCaptures();
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: surfaceColor }]}>
        <Ionicons name={emptyIcon} size={48} color={accentColor} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {emptyTitle}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {emptySubtitle}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Ionicons name={icon} size={24} color={accentColor} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: surfaceColor }]}>
          <Text style={[styles.countText, { color: accentColor }]}>
            {captures.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={captures}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <CaptureCard item={item} onDelete={handleDelete} />
        )}
        contentContainerStyle={captures.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={isLoading ? null : renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accentColor}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
```

**Step 2: Rewrite places.tsx**

Replace `app/(tabs)/places.tsx` entirely:
```typescript
import React from 'react';
import { CategoryScreen } from '@/components/CategoryScreen';

export default function PlacesScreen() {
  return (
    <CategoryScreen
      category="place"
      title="장소"
      icon="location"
      emptyIcon="location-outline"
      emptyTitle="저장된 장소가 없습니다"
      emptySubtitle={'맛집, 카페, 여행지 스크린샷을 캡처하면\n자동으로 여기에 정리됩니다'}
    />
  );
}
```

**Step 3: Rewrite texts.tsx**

Replace `app/(tabs)/texts.tsx` entirely:
```typescript
import React from 'react';
import { CategoryScreen } from '@/components/CategoryScreen';

export default function TextsScreen() {
  return (
    <CategoryScreen
      category="text"
      title="텍스트"
      icon="document-text"
      emptyIcon="document-text-outline"
      emptyTitle="저장된 텍스트가 없습니다"
      emptySubtitle={'AI 정보, 코드, 레시피, 기사 스크린샷을\n캡처하면 자동으로 여기에 정리됩니다'}
    />
  );
}
```

**Step 4: Verify the app runs**

Run: `npx expo start`
Navigate to Places tab and Texts tab — verify they render identically to before.

**Step 5: Commit**

```bash
git add components/CategoryScreen.tsx app/\(tabs\)/places.tsx app/\(tabs\)/texts.tsx
git commit -m "refactor: extract shared CategoryScreen component, eliminate tab duplication"
```

---

### Task 5: Fix CaptureCard Styles & Remove Unused Imports

**Files:**
- Modify: `components/CaptureCard.tsx`

**Step 1: Fix cardTitle missing fontSize and paddingHorizontal**

In `components/CaptureCard.tsx`, update the `cardTitle` style (line 203-205):
```typescript
// Before:
cardTitle: {
  lineHeight: 24,
},

// After:
cardTitle: {
  fontSize: 16,
  fontWeight: '700',
  lineHeight: 24,
  paddingHorizontal: 16,
  paddingTop: 10,
},
```

**Step 2: Remove unused imports**

Update the imports at the top of `components/CaptureCard.tsx` (lines 1-17):

Remove from import: `ActivityIndicator`, `ScrollView` (line 8-9), `Dimensions` (line 12), `MapProvider` (line 17).

```typescript
// Before:
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { getMapLinks, openMap, openUrl, MapProvider } from '@/services/map-linker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// After:
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { getMapLinks, openMap, openUrl } from '@/services/map-linker';
```

Also delete the `SCREEN_WIDTH` line (line 24).

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add components/CaptureCard.tsx
git commit -m "fix: add missing cardTitle styles and remove unused imports"
```

---

### Task 6: Type Safety for Database Rows

**Files:**
- Modify: `services/database.ts`

**Why:** All database queries use `any` type. This bypasses TypeScript's safety guarantees.

**Step 1: Define the raw row type**

Add at the top of `services/database.ts` (after the imports, before CaptureItem interface):
```typescript
interface CaptureRow {
  id: number;
  category: string;
  title: string;
  summary: string;
  place_name: string | null;
  address: string | null;
  extracted_text: string;
  links: string;
  tags: string;
  source: string;
  image_uri: string;
  created_at: string;
}
```

**Step 2: Replace `any` with `CaptureRow`**

Update all `getAllAsync<any>` and `getFirstAsync<any>` calls:

```typescript
// Line 74: getAllCaptures
const rows = await database.getAllAsync<CaptureRow>(

// Line 85: getCapturesByCategory
const rows = await database.getAllAsync<CaptureRow>(

// Line 96: searchCaptures
const rows = await database.getAllAsync<CaptureRow>(

// Line 113: getCaptureById
const row = await database.getFirstAsync<CaptureRow>(
```

Update `mapRowToCapture` signature (line 120):
```typescript
function mapRowToCapture(row: CaptureRow): CaptureItem {
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add services/database.ts
git commit -m "refactor: replace any with typed CaptureRow in database service"
```

---

## Phase 3: Performance

### Task 7: Shared CapturesContext

**Files:**
- Create: `contexts/CapturesContext.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/index.tsx`
- Modify: `components/CategoryScreen.tsx`

**Why:** Each tab independently queries the database on every focus. A shared context eliminates redundant queries and keeps data in sync.

**Step 1: Create the context**

Create `contexts/CapturesContext.tsx`:
```typescript
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CaptureItem,
  getAllCaptures,
  deleteCapture as dbDeleteCapture,
  searchCaptures as dbSearchCaptures,
} from '@/services/database';
import { CaptureCategory } from '@/services/ai-analyzer';

interface CapturesContextValue {
  captures: CaptureItem[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  deleteCapture: (id: number) => Promise<void>;
  searchCaptures: (query: string) => Promise<CaptureItem[]>;
  getCapturesByCategory: (category: CaptureCategory) => CaptureItem[];
}

const CapturesContext = createContext<CapturesContextValue | null>(null);

export function CapturesProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const items = await getAllCaptures();
      setCaptures(items);
    } catch (error) {
      console.error('Failed to load captures:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteCapture = useCallback(async (id: number) => {
    await dbDeleteCapture(id);
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const searchCaptures = useCallback(async (query: string): Promise<CaptureItem[]> => {
    if (!query) return captures;
    return dbSearchCaptures(query);
  }, [captures]);

  const getCapturesByCategory = useCallback(
    (category: CaptureCategory): CaptureItem[] => {
      return captures.filter((c) => c.category === category);
    },
    [captures]
  );

  return (
    <CapturesContext.Provider
      value={{ captures, isLoading, refresh, deleteCapture, searchCaptures, getCapturesByCategory }}
    >
      {children}
    </CapturesContext.Provider>
  );
}

export function useCaptures() {
  const context = useContext(CapturesContext);
  if (!context) {
    throw new Error('useCaptures must be used within a CapturesProvider');
  }
  return context;
}
```

**Step 2: Wrap app with provider**

Modify `app/_layout.tsx` — wrap `RootLayoutNav` return:
```typescript
// Add import:
import { CapturesProvider } from '@/contexts/CapturesContext';

// In RootLayoutNav, wrap Stack with CapturesProvider:
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'light' ? DefaultTheme : CapSaveDarkTheme}>
      <CapturesProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="capture/analyze"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </CapturesProvider>
    </ThemeProvider>
  );
}
```

**Step 3: Update HomeScreen to use context**

Modify `app/(tabs)/index.tsx`:
- Remove direct database imports (`getAllCaptures`, `searchCaptures`, `deleteCapture`)
- Import `useCaptures` from context
- Replace local state/loading with context values:

```typescript
import { useCaptures } from '@/contexts/CapturesContext';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { captures: allCaptures, isLoading, refresh, deleteCapture, searchCaptures } = useCaptures();

  const [displayCaptures, setDisplayCaptures] = useState<CaptureItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fabScale = useRef(new Animated.Value(1)).current;

  // Sync display captures with context
  useEffect(() => {
    if (!searchQuery) {
      setDisplayCaptures(allCaptures);
    }
  }, [allCaptures, searchQuery]);

  const handleSearch = useCallback(async () => {
    if (searchQuery) {
      const results = await searchCaptures(searchQuery);
      setDisplayCaptures(results);
    } else {
      setDisplayCaptures(allCaptures);
    }
  }, [searchQuery, allCaptures, searchCaptures]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDelete = async (id: number) => {
    await deleteCapture(id);
  };

  // ... rest stays the same, but use displayCaptures instead of captures
  const totalCount = displayCaptures.length;
  const placeCount = displayCaptures.filter((c) => c.category === 'place').length;
  const textCount = displayCaptures.filter((c) => c.category === 'text').length;

  // In FlatList, use displayCaptures instead of captures
  // In search onSubmitEditing, call handleSearch
  // In clear button onPress, setSearchQuery('') then setDisplayCaptures(allCaptures)
```

**Step 4: Update CategoryScreen to use context**

Modify `components/CategoryScreen.tsx`:
- Remove direct database imports
- Use `useCaptures` context:

```typescript
import { useCaptures } from '@/contexts/CapturesContext';

// Inside the component:
const { getCapturesByCategory: getByCategory, isLoading, refresh, deleteCapture } = useCaptures();

const captures = getByCategory(category);

// Remove local captures state, loadCaptures, and useFocusEffect
// Keep refreshing state for pull-to-refresh UX:

const [refreshing, setRefreshing] = useState(false);

useFocusEffect(
  useCallback(() => {
    refresh();
  }, [refresh])
);

const handleRefresh = async () => {
  setRefreshing(true);
  await refresh();
  setRefreshing(false);
};

const handleDelete = async (id: number) => {
  await deleteCapture(id);
};
```

**Step 5: Update analyze screen to trigger refresh**

Modify `app/capture/analyze.tsx` — after successful save, trigger a refresh:
```typescript
import { useCaptures } from '@/contexts/CapturesContext';

// Inside component:
const { refresh } = useCaptures();

const handleSave = async () => {
  if (!result || !imageUri) return;
  setIsSaving(true);
  try {
    await saveCapture(result, imageUri);
    await refresh();
    router.back();
  } catch (error) {
    Alert.alert('저장 실패', '캡처를 저장하는 중 오류가 발생했습니다.');
  } finally {
    setIsSaving(false);
  }
};
```

**Step 6: Verify the app runs**

Run: `npx expo start`
- Add a capture → verify it appears on Home and correct category tab
- Delete from Places → verify it's gone from Home too
- Search on Home → verify results display

**Step 7: Commit**

```bash
git add contexts/CapturesContext.tsx app/_layout.tsx app/\(tabs\)/index.tsx components/CategoryScreen.tsx app/capture/analyze.tsx
git commit -m "feat: add shared CapturesContext, eliminate redundant DB queries across tabs"
```

---

### Task 8: Image Optimization

**Files:**
- Modify: `package.json` (add expo-image)
- Modify: `components/CaptureCard.tsx`
- Modify: `app/capture/analyze.tsx`
- Modify: `services/ai-analyzer.ts`

**Why:** Full-resolution images load for every card in FlatList (memory), and full-size images are base64-encoded for API (bandwidth).

**Step 1: Install expo-image**

```bash
npx expo install expo-image
```

**Step 2: Replace Image with ExpoImage in CaptureCard**

Modify `components/CaptureCard.tsx`:
```typescript
// Replace:
import { ... Image, ... } from 'react-native';

// With:
import { Image } from 'expo-image';

// Remove Image from react-native import list.
// ExpoImage is a drop-in replacement — same `source`, `style`, `contentFit` (instead of resizeMode).

// Update the Image usage (around line 85):
<Image
  source={{ uri: item.imageUri }}
  style={styles.cardImage}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

**Step 3: Replace Image in analyze.tsx**

Modify `app/capture/analyze.tsx`:
```typescript
// Replace react-native Image import with expo-image:
import { Image } from 'expo-image';

// Update Image usage (line 115):
<Image
  source={{ uri: imageUri }}
  style={styles.image}
  contentFit="cover"
  transition={200}
/>
```

**Step 4: Add image resizing before API call**

Modify `services/ai-analyzer.ts` — resize image before base64 encoding:
```typescript
import * as ImageManipulator from 'expo-image-manipulator';

// Add resize step before base64 read (replace lines 51-54):
export async function analyzeImage(imageUri: string): Promise<AnalysisResult> {
  const apiKey = Constants.expoConfig?.extra?.openaiApiKey;

  if (!apiKey) {
    throw new Error('OpenAI API Key가 설정되지 않았습니다. app.json의 extra.openaiApiKey를 확인해주세요.');
  }

  // Resize image to reduce memory and bandwidth
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  const base64Image = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: 'base64',
  });

  // ... rest of function stays the same
```

Install the dependency:
```bash
npx expo install expo-image-manipulator
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Verify**

Run: `npx expo start`
- Verify images display correctly in cards and analyze screen
- Verify analysis still works with resized images

**Step 7: Commit**

```bash
git add package.json components/CaptureCard.tsx app/capture/analyze.tsx services/ai-analyzer.ts
git commit -m "perf: use expo-image for caching, resize images before API upload"
```

---

## Phase 4: Architecture

### Task 9: Abstract AI Analyzer Interface

**Files:**
- Create: `services/analyzers/types.ts`
- Create: `services/analyzers/openai-analyzer.ts`
- Modify: `services/ai-analyzer.ts` (becomes re-export)

**Why:** Current code is tightly coupled to OpenAI. An interface allows swapping providers (Claude, Gemini, local models) without changing consumers.

**Step 1: Create the analyzer interface**

Create `services/analyzers/types.ts`:
```typescript
export type CaptureCategory = 'place' | 'text';
export type SourceApp = 'instagram' | 'threads' | 'naver' | 'google' | 'youtube' | 'other';

export interface AnalysisResult {
  category: CaptureCategory;
  title: string;
  summary: string;
  placeName?: string;
  address?: string;
  extractedText: string;
  links: string[];
  tags: string[];
  source: SourceApp;
}

export interface ImageAnalyzer {
  analyze(imageUri: string): Promise<AnalysisResult>;
}
```

**Step 2: Move OpenAI implementation**

Create `services/analyzers/openai-analyzer.ts`:
```typescript
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';
import { AnalysisResult, ImageAnalyzer } from './types';

const SYSTEM_PROMPT = `...`; // Move the existing SYSTEM_PROMPT here

export class OpenAIAnalyzer implements ImageAnalyzer {
  private apiKey: string;

  constructor() {
    const key = Constants.expoConfig?.extra?.openaiApiKey;
    if (!key) {
      throw new Error('OpenAI API Key가 설정되지 않았습니다.');
    }
    this.apiKey = key;
  }

  async analyze(imageUri: string): Promise<AnalysisResult> {
    // Move the existing analyzeImage logic here
    // (resize + base64 + fetch + parse)
  }
}
```

**Step 3: Update ai-analyzer.ts as a facade**

Replace `services/ai-analyzer.ts`:
```typescript
// Re-export types for backward compatibility
export type { CaptureCategory, SourceApp, AnalysisResult } from './analyzers/types';
export type { ImageAnalyzer } from './analyzers/types';

import { OpenAIAnalyzer } from './analyzers/openai-analyzer';
import { ImageAnalyzer } from './analyzers/types';

let analyzer: ImageAnalyzer | null = null;

function getAnalyzer(): ImageAnalyzer {
  if (!analyzer) {
    analyzer = new OpenAIAnalyzer();
  }
  return analyzer;
}

export async function analyzeImage(imageUri: string) {
  return getAnalyzer().analyze(imageUri);
}
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors (all existing imports of `analyzeImage` and types still work)

**Step 5: Commit**

```bash
git add services/analyzers/ services/ai-analyzer.ts
git commit -m "refactor: abstract AI analyzer behind ImageAnalyzer interface"
```

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1. Security | Tasks 1-3 | URL validation, debounce, API key docs |
| 2. Quality | Tasks 4-6 | DRY refactoring, style fixes, type safety |
| 3. Performance | Tasks 7-8 | Shared context, image optimization |
| 4. Architecture | Task 9 | Analyzer abstraction |

**Total: 9 tasks, ~9 commits**

### Out of Scope (Future Work)
- Backend proxy for OpenAI API key (requires separate infrastructure project)
- Full E2E testing with Detox
- Image integrity checks (verify stored URIs still exist)
- Migration system for SQLite schema changes
