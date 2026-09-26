import type { PlaceReviewResult, PlaceReviewVideo, ReviewSourceStatus } from '@scrave/shared';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface FetchPlaceReviewsOptions {
  serverUrl: string;
  getToken: () => Promise<string | null>;
  fetchImpl?: FetchLike;
}

const LOGIN_REQUIRED = '로그인한 뒤 후기와 영상을 볼 수 있습니다.';
const LOAD_FAILED = '후기와 영상을 불러오지 못했습니다.';

const cache = new Map<string, PlaceReviewResult>();

export function clearPlaceReviewCache() {
  cache.clear();
}

// Same endpoint as the web capture card: POST /api/place-reviews on the web server.
export async function fetchPlaceReviews(
  placeName: string,
  { serverUrl, getToken, fetchImpl = fetch }: FetchPlaceReviewsOptions,
): Promise<PlaceReviewResult> {
  const cached = cache.get(placeName);
  if (cached) return cached;

  const token = await getToken();
  if (!token) throw new Error(LOGIN_REQUIRED);

  const response = await fetchImpl(`${serverUrl}/api/place-reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: placeName }),
  });

  if (response.status === 401) throw new Error(LOGIN_REQUIRED);
  if (!response.ok) throw new Error(LOAD_FAILED);

  const result = (await response.json()) as PlaceReviewResult;
  cache.set(placeName, result);
  return result;
}

export function describeReviewSource(
  source: 'naver' | 'youtube',
  status: ReviewSourceStatus,
  isEmpty: boolean,
): string | null {
  if (status === 'no-key') {
    return `${source === 'naver' ? '네이버 검색 API' : 'YouTube API'} 키가 아직 없어 골라 드리지 못했습니다.`;
  }
  if (status === 'error') {
    return `${source === 'naver' ? '네이버 후기를' : '유튜브 영상을'} 불러오지 못했습니다.`;
  }
  if (isEmpty) {
    return `기준을 통과한 ${source === 'naver' ? '후기가' : '영상이'} 없습니다.`;
  }
  return null;
}

export function formatSceneLine(video: Pick<PlaceReviewVideo, 'sceneCheck' | 'scenes'>): string {
  return video.sceneCheck === 'checked' && video.scenes?.length
    ? `장면 ${video.scenes.join(' · ')}`
    : '장면 확인 안 됨';
}
