import { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { installSupabaseClientMock } from './e2e-supabase-client';

export const E2E_AUTH_HEADER = 'x-scrave-e2e-auth';

const E2E_USER_ID = 'e2e-user-1';
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

interface CaptureRow {
  id: number;
  category: 'place' | 'text';
  title: string;
  summary: string;
  places: Array<{
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  }>;
  extracted_text: string;
  links: string[];
  tags: string[];
  source: string;
  image_url: string;
  created_at: string;
  user_id: string;
  confidence: number;
  reclassified_at: string | null;
  deleted_at: string | null;
  source_account_id: string | null;
}

export function createCaptureRows(): CaptureRow[] {
  return [
    {
      id: 501,
      category: 'place',
      title: '성수 카페 저장',
      summary: '좌표가 이미 있는 장소 캡처',
      places: [{ name: '성수 테스트 카페', address: '서울 성동구', lat: 37.5446, lng: 127.0557 }],
      extracted_text: '',
      links: [],
      tags: ['카페'],
      source: 'other',
      image_url: '/icon.svg',
      created_at: '2026-06-05T10:00:00.000Z',
      user_id: E2E_USER_ID,
      confidence: 0.92,
      reclassified_at: null,
      deleted_at: null,
      source_account_id: null,
    },
    {
      id: 502,
      category: 'place',
      title: '을지로 맛집 저장',
      summary: '좌표 변환이 필요한 장소 캡처',
      places: [{ name: '을지로 테스트 식당', address: '서울 중구 을지로' }],
      extracted_text: '',
      links: [],
      tags: ['식당'],
      source: 'other',
      image_url: '/icon.svg',
      created_at: '2026-06-05T09:00:00.000Z',
      user_id: E2E_USER_ID,
      confidence: 0.88,
      reclassified_at: null,
      deleted_at: null,
      source_account_id: null,
    },
  ];
}

export async function createTinyPng(fileName: string): Promise<string> {
  const tmpPath = path.join('/tmp', fileName);
  fs.writeFileSync(tmpPath, Buffer.from(TINY_PNG_B64, 'base64'));
  return tmpPath;
}

export async function installMapSdkMocks(page: Page) {
  await page.addInitScript(() => {
    class NaverLatLng {
      private readonly latitude: number;
      private readonly longitude: number;

      constructor(lat: number, lng: number) {
        this.latitude = lat;
        this.longitude = lng;
      }

      lat() { return this.latitude; }
      lng() { return this.longitude; }
    }

    class NaverMap {
      fitBounds() {}
      panTo() {}
    }

    class NaverMarker {
      setMap() {}
    }

    class GoogleMap {
      fitBounds() {}
      panTo() {}
    }

    class GoogleMarker {
      addListener() {}
      setMap() {}
    }

    class GoogleBounds {
      extend() {}
    }

    window.naver = {
      maps: {
        Map: NaverMap,
        Marker: NaverMarker,
        LatLng: NaverLatLng,
        Point: class {},
        LatLngBounds: class {
          extend() {}
        },
        Event: { addListener() {} },
        Service: {
          Status: { OK: 'OK' },
          geocode(_opts, cb) {
            cb('OK', {
              v2: {
                addresses: [{ x: '126.9918', y: '37.5663', roadAddress: '서울 중구 을지로' }],
              },
            });
          },
        },
      },
    };

    window.google = {
      maps: {
        Map: GoogleMap,
        Marker: GoogleMarker,
        LatLngBounds: GoogleBounds,
        SymbolPath: { CIRCLE: 'CIRCLE' },
      },
    };
  });
}

export async function mockAuthenticatedBackend(page: Page, initialRows: CaptureRow[]) {
  const rows = [...initialRows];
  await installSupabaseClientMock(page);

  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: E2E_USER_ID,
          email: 'e2e@scrave.local',
          is_anonymous: false,
        },
      }),
    });
  });

  await page.route('**/rest/v1/user_preferences**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ preferred_nav_app: 'naver' }),
    });
  });

  await page.route('**/rest/v1/captures**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Partial<CaptureRow>;
      const inserted = createInsertedCaptureRow(body);
      rows.unshift(inserted);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(inserted) });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` },
      body: JSON.stringify(rows),
    });
  });

  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        category: 'place',
        title: 'AI 저장 테스트 장소',
        summary: 'AI 분석 후 저장되는 장소',
        places: [{ name: 'AI 테스트 카페', address: '서울 마포구', lat: 37.5563, lng: 126.9236 }],
        extractedText: '',
        links: [],
        tags: ['AI분석'],
        source: 'other',
        confidence: 0.91,
        sourceAccountId: null,
      }),
    });
  });

  await page.route('**/api/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ path: `${E2E_USER_ID}/uploaded.png` }),
    });
  });
}

function createInsertedCaptureRow(body: Partial<CaptureRow>): CaptureRow {
  return {
    id: 700,
    category: body.category ?? 'place',
    title: body.title ?? '저장된 분석 결과',
    summary: body.summary ?? '',
    places: body.places ?? [],
    extracted_text: body.extracted_text ?? '',
    links: body.links ?? [],
    tags: body.tags ?? [],
    source: body.source ?? 'other',
    image_url: body.image_url ?? 'e2e/uploaded.png',
    created_at: '2026-06-05T12:00:00.000Z',
    user_id: E2E_USER_ID,
    confidence: body.confidence ?? 0.9,
    reclassified_at: null,
    deleted_at: null,
    source_account_id: null,
  };
}
