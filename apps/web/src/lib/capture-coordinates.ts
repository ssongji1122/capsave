import type { PlaceInfo } from '@scrave/shared';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * 서버에 캡처 한 건의 좌표를 채워 저장해 달라고 요청합니다.
 * 실패해도 저장이나 지도 화면을 막지 않도록 null을 돌려줍니다.
 */
export async function requestCaptureCoordinates(
  captureId: number,
  fetchImpl: FetchLike = fetch
): Promise<PlaceInfo[] | null> {
  try {
    const res = await fetchImpl('/api/geocode/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captureId }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return Array.isArray(body?.places) ? (body.places as PlaceInfo[]) : null;
  } catch {
    return null;
  }
}
