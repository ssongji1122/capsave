// Client-side helpers for picking captures and editing a guide draft
// before it is saved. The draft lives in sessionStorage until then.

import type { CaptureItem, GuidePlace, GuideReference, PublicGuide } from '@scrave/shared';
import {
  MAX_GUIDE_CAPTURES,
  MAX_GUIDE_PLACES,
  type UnresolvedPlace,
} from '@/lib/guide-draft';

export const GUIDE_DRAFT_STORAGE_KEY = 'scrave:guide-draft';
const MIN_DRAFT_PLACES = 2;

export interface StoredGuideDraft {
  guide: PublicGuide;
  coverImageUrl: string | null;
  fallback: boolean;
  unresolved: UnresolvedPlace[];
}

export type EditablePlaceField = 'visitWindow' | 'practicalNote';

export function isPickableCapture(capture: CaptureItem): boolean {
  return capture.category === 'place' && capture.places.length > 0;
}

export function togglePickedCapture(picked: number[], id: number): number[] {
  if (picked.includes(id)) return picked.filter((pickedId) => pickedId !== id);
  if (picked.length >= MAX_GUIDE_CAPTURES) return picked;
  return [...picked, id];
}

export function countPickedPlaces(captures: CaptureItem[], picked: number[]): number {
  return captures
    .filter(({ id }) => picked.includes(id))
    .reduce((total, capture) => total + capture.places.length, 0);
}

function withPlaces(guide: PublicGuide, places: GuidePlace[]): PublicGuide {
  return {
    ...guide,
    places: places.map((place, index) => ({ ...place, sequence: index + 1 })),
  };
}

export function moveGuidePlace(guide: PublicGuide, placeId: string, delta: -1 | 1): PublicGuide {
  const index = guide.places.findIndex(({ id }) => id === placeId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= guide.places.length) return guide;

  const places = [...guide.places];
  [places[index], places[target]] = [places[target]!, places[index]!];
  return withPlaces(guide, places);
}

export function removeGuidePlace(guide: PublicGuide, placeId: string): PublicGuide {
  if (guide.places.length <= MIN_DRAFT_PLACES) return guide;
  return withPlaces(
    guide,
    guide.places.filter(({ id }) => id !== placeId)
  );
}

export function updateGuidePlaceText(
  guide: PublicGuide,
  placeId: string,
  field: EditablePlaceField,
  value: string,
): PublicGuide {
  const text = value.trim();
  if (!text) return guide;
  return {
    ...guide,
    places: guide.places.map((place) => (place.id === placeId ? { ...place, [field]: text } : place)),
  };
}

export function attachGuidePlaceReferences(
  guide: PublicGuide,
  placeId: string,
  references: GuideReference[],
): PublicGuide {
  return {
    ...guide,
    places: guide.places.map((place) => {
      if (place.id !== placeId) return place;
      const urls = new Set(place.references.map(({ url }) => url));
      const added = references.filter(({ url }) => !urls.has(url));
      return { ...place, references: [...place.references, ...added] };
    }),
  };
}

export function serializeGuideDraft(draft: StoredGuideDraft): string {
  return JSON.stringify(draft);
}

function isGuidePlace(value: unknown): value is GuidePlace {
  if (typeof value !== 'object' || value === null) return false;
  const place = value as Partial<GuidePlace>;
  return (
    typeof place.id === 'string' &&
    typeof place.name === 'string' &&
    typeof place.coordinates?.latitude === 'number' &&
    typeof place.coordinates?.longitude === 'number' &&
    Array.isArray(place.references)
  );
}

export function parseStoredGuideDraft(text: string | null): StoredGuideDraft | null {
  if (!text) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;

  const draft = data as Partial<StoredGuideDraft>;
  const guide = draft.guide as Partial<PublicGuide> | undefined;
  if (
    !guide ||
    guide.status !== 'draft' ||
    typeof guide.slug !== 'string' ||
    typeof guide.title !== 'string' ||
    !Array.isArray(guide.places) ||
    guide.places.length < MIN_DRAFT_PLACES ||
    !guide.places.every(isGuidePlace)
  ) {
    return null;
  }

  return {
    guide: guide as PublicGuide,
    coverImageUrl: typeof draft.coverImageUrl === 'string' ? draft.coverImageUrl : null,
    fallback: draft.fallback === true,
    unresolved: Array.isArray(draft.unresolved) ? draft.unresolved : [],
  };
}

export function getDraftErrorMessage(status: number, body: unknown): string {
  const data = (typeof body === 'object' && body !== null ? body : {}) as {
    error?: string;
    unresolved?: UnresolvedPlace[];
    limit?: number;
  };

  if (status === 401) return '로그인한 뒤 가이드를 만들 수 있습니다.';
  if (status === 429) {
    const count = typeof data.limit === 'number' ? ` ${data.limit}회` : '';
    return `오늘 만들 수 있는 가이드 초안${count}를 모두 썼습니다. 내일 다시 시도해 주세요.`;
  }
  if (data.error === 'not-enough-places') {
    const names = (data.unresolved ?? []).map(({ name }) => name).join(', ');
    return `위치를 아는 장소가 두 곳 이상 필요합니다.${names ? ` 위치를 찾지 못한 장소: ${names}` : ''}`;
  }
  if (data.error === 'too-many-places') {
    return `장소가 ${MAX_GUIDE_PLACES}곳을 넘습니다. 캡처를 줄여 다시 골라 주세요.`;
  }
  return '가이드 초안을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
}
