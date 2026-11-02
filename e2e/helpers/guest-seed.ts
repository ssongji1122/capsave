import { Page } from '@playwright/test';

const GUEST_STORAGE_KEY = 'scrave_guest_captures';
const TINY_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

export const GUEST_SEED_CAPTURE_ID = -1;
export const GUEST_SEED_TITLE = '성수 브런치 저장';
export const GUEST_SEED_PLACE_NAME = '오브젝트 성수';

/**
 * 샘플 자료를 실제 자료처럼 섞지 않기로 했으므로(docs/ux/2026-11-02_simple-journey.md),
 * 지도·장소 시험은 게스트 보관함(sessionStorage)에 좌표가 있는 장소 캡처를 심고 시작합니다.
 */
export async function seedGuestPlaceCapture(page: Page) {
  await page.addInitScript(
    ({ key, capture }) => {
      window.sessionStorage.setItem(key, JSON.stringify([capture]));
    },
    {
      key: GUEST_STORAGE_KEY,
      capture: {
        id: GUEST_SEED_CAPTURE_ID,
        imageBase64: TINY_PNG_DATA_URI,
        title: GUEST_SEED_TITLE,
        summary: '장소명, 주소, 태그를 뽑아 지도로 이어지는 게스트 저장 캡처',
        category: 'place',
        confidence: 0.94,
        tags: ['성수', '브런치', '지도'],
        links: [],
        source: 'other',
        places: [
          { name: GUEST_SEED_PLACE_NAME, address: '서울 성동구 연무장길', lat: 37.5446, lng: 127.0557 },
        ],
        createdAt: '2026-06-22T09:00:00.000Z',
      },
    },
  );
}
