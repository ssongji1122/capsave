import type { GuideVisibility, PublicGuide } from '@scrave/shared';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const MIN_GUIDE_CAPTURES = 2;
export const MAX_GUIDE_CAPTURES = 10;

const LOGIN_REQUIRED = '로그인한 뒤 가이드를 만들 수 있습니다.';
const DRAFT_FAILED = '가이드 초안을 만들지 못했습니다.';
const SAVE_FAILED = '가이드를 저장하지 못했습니다.';

export interface MobileGuideApiOptions {
  serverUrl: string;
  getToken: () => Promise<string | null>;
  fetchImpl?: FetchLike;
}

export interface MobileGuideDraftResponse {
  guide: PublicGuide;
  fallback: boolean;
  unresolved: Array<{ name: string; captureId: number }>;
  coverImageUrl: string | null;
}

let currentMobileGuideDraft: MobileGuideDraftResponse | null = null;

export function setCurrentMobileGuideDraft(draft: MobileGuideDraftResponse | null) {
  currentMobileGuideDraft = draft;
}

export function getCurrentMobileGuideDraft(): MobileGuideDraftResponse | null {
  return currentMobileGuideDraft;
}

export function toggleGuideCaptureSelection(
  selectedIds: readonly number[],
  captureId: number,
): { selectedIds: number[]; limitReached: boolean } {
  if (selectedIds.includes(captureId)) {
    return {
      selectedIds: selectedIds.filter((id) => id !== captureId),
      limitReached: false,
    };
  }
  if (selectedIds.length >= MAX_GUIDE_CAPTURES) {
    return {
      selectedIds: [...selectedIds],
      limitReached: true,
    };
  }
  return {
    selectedIds: [...selectedIds, captureId],
    limitReached: false,
  };
}

export function moveMobileGuidePlace(
  guide: PublicGuide,
  placeId: string,
  direction: -1 | 1,
): PublicGuide {
  const index = guide.places.findIndex((p) => p.id === placeId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= guide.places.length) {
    return guide;
  }
  const nextPlaces = [...guide.places];
  const [moved] = nextPlaces.splice(index, 1);
  if (!moved) return guide;
  nextPlaces.splice(target, 0, moved);

  return {
    ...guide,
    places: nextPlaces.map((place, idx) => ({
      ...place,
      sequence: idx + 1,
    })),
  };
}

export function removeMobileGuidePlace(
  guide: PublicGuide,
  placeId: string,
): PublicGuide {
  if (guide.places.length <= 2) return guide;
  const filtered = guide.places.filter((p) => p.id !== placeId);
  if (filtered.length === guide.places.length) return guide;

  return {
    ...guide,
    places: filtered.map((place, idx) => ({
      ...place,
      sequence: idx + 1,
    })),
  };
}

export async function createMobileGuideDraft(
  captureIds: number[],
  nights: number,
  { serverUrl, getToken, fetchImpl = fetch }: MobileGuideApiOptions,
): Promise<MobileGuideDraftResponse> {
  const token = await getToken();
  if (!token) throw new Error(LOGIN_REQUIRED);

  const response = await fetchImpl(`${serverUrl}/api/guides/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ captureIds, nights }),
  });

  if (response.status === 401) throw new Error(LOGIN_REQUIRED);
  if (response.status === 429) {
    throw new Error('오늘 만들 수 있는 가이드 초안 5회를 모두 썼습니다.');
  }
  if (!response.ok) throw new Error(DRAFT_FAILED);

  return (await response.json()) as MobileGuideDraftResponse;
}

export async function saveMobileGuide(
  guide: PublicGuide,
  visibility: GuideVisibility,
  { serverUrl, getToken, fetchImpl = fetch }: MobileGuideApiOptions,
): Promise<{ id: string; slug: string; visibility: GuideVisibility; shareUrl: string }> {
  const token = await getToken();
  if (!token) throw new Error(LOGIN_REQUIRED);

  const response = await fetchImpl(`${serverUrl}/api/guides`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      guide,
      status: 'ready',
      visibility,
    }),
  });

  if (response.status === 401) throw new Error(LOGIN_REQUIRED);
  if (!response.ok) throw new Error(SAVE_FAILED);

  const data = (await response.json()) as {
    guide: { id: string; slug: string; visibility: GuideVisibility };
  };
  const base = serverUrl.replace(/\/$/, '');
  return {
    id: data.guide.id,
    slug: data.guide.slug,
    visibility: data.guide.visibility,
    shareUrl: `${base}/g/${data.guide.slug}`,
  };
}
