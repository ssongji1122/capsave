// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { CaptureItem } from '@scrave/shared';

const mocks = vi.hoisted(() => ({
  getAuthUserAndTouch: vi.fn(),
  createClient: vi.fn(),
  getUserCapturesByIds: vi.fn(),
  updateCapturePlaces: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ getAuthUserAndTouch: mocks.getAuthUserAndTouch }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/guide-draft-sources', () => ({ getUserCapturesByIds: mocks.getUserCapturesByIds }));
vi.mock('@scrave/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@scrave/shared')>()),
  updateCapturePlaces: mocks.updateCapturePlaces,
}));

const SUPABASE = { from: vi.fn() };
const FRESH = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

function capture(places: CaptureItem['places']): CaptureItem {
  return {
    id: 7,
    category: 'place',
    title: '성수 카페',
    summary: '',
    places,
    extractedText: '',
    links: [],
    tags: [],
    source: 'instagram',
    imageUrl: 'captures/u/7.jpg',
    createdAt: '2026-10-01T00:00:00Z',
    userId: 'user-1',
    confidence: 0.9,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  };
}

function coordinatesRequest(body: unknown) {
  return new NextRequest('http://localhost/api/geocode/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function googleFound() {
  return vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        status: 'OK',
        results: [{ geometry: { location: { lat: 37.54, lng: 127.05 } }, place_id: 'ChIJ-bb' }],
      }),
      { status: 200 }
    )
  );
}

describe('POST /api/geocode/capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-google-key';
    mocks.createClient.mockResolvedValue(SUPABASE);
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
  });

  it('rejects malformed JSON before auth', async () => {
    const { POST } = await import('@/app/api/geocode/capture/route');
    const response = await POST(coordinatesRequest('{bad'));

    expect(response.status).toBe(400);
    expect(mocks.getAuthUserAndTouch).not.toHaveBeenCalled();
  });

  it.each([{}, { captureId: 0 }, { captureId: 1.5 }, { captureId: '7' }])(
    'rejects an invalid capture id %j before auth',
    async (body) => {
      const { POST } = await import('@/app/api/geocode/capture/route');
      const response = await POST(coordinatesRequest(body));

      expect(response.status).toBe(400);
      expect(mocks.getAuthUserAndTouch).not.toHaveBeenCalled();
    }
  );

  it('rejects unauthenticated users before reading captures or calling Google', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = googleFound();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/geocode/capture/route');
    const response = await POST(coordinatesRequest({ captureId: 7 }));

    expect(response.status).toBe(401);
    expect(mocks.getUserCapturesByIds).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the capture is not the user’s live capture', async () => {
    mocks.getUserCapturesByIds.mockResolvedValue([]);

    const { POST } = await import('@/app/api/geocode/capture/route');
    const response = await POST(coordinatesRequest({ captureId: 7 }));

    expect(response.status).toBe(404);
    expect(mocks.getUserCapturesByIds).toHaveBeenCalledWith(SUPABASE, 'user-1', [7]);
  });

  it('geocodes places without coordinates and stores them on the capture', async () => {
    const fetchMock = googleFound();
    vi.stubGlobal('fetch', fetchMock);
    const fresh = { name: '최근 카페', lat: 37.5, lng: 127, geocodedAt: FRESH };
    mocks.getUserCapturesByIds.mockResolvedValue([capture([{ name: '블루보틀', address: '성수동' }, fresh])]);
    mocks.updateCapturePlaces.mockImplementation(async (_client, _id, places) => capture(places));

    const { POST } = await import('@/app/api/geocode/capture/route');
    const response = await POST(coordinatesRequest({ captureId: 7 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const savedPlaces = mocks.updateCapturePlaces.mock.calls[0][2];
    expect(mocks.updateCapturePlaces).toHaveBeenCalledWith(SUPABASE, 7, savedPlaces);
    expect(savedPlaces).toEqual([
      {
        name: '블루보틀',
        address: '성수동',
        lat: 37.54,
        lng: 127.05,
        placeId: 'ChIJ-bb',
        geocodedAt: expect.any(String),
      },
      fresh,
    ]);
    expect(body).toEqual({ captureId: 7, places: savedPlaces });
  });

  it('does not call Google or write when every place is fresh', async () => {
    const fetchMock = googleFound();
    vi.stubGlobal('fetch', fetchMock);
    const places = [{ name: '최근 카페', lat: 37.5, lng: 127, geocodedAt: FRESH }];
    mocks.getUserCapturesByIds.mockResolvedValue([capture(places)]);

    const { POST } = await import('@/app/api/geocode/capture/route');
    const response = await POST(coordinatesRequest({ captureId: 7 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ captureId: 7, places });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.updateCapturePlaces).not.toHaveBeenCalled();
  });

  it('returns 500 when the Google key is not configured', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const { POST } = await import('@/app/api/geocode/capture/route');
    const response = await POST(coordinatesRequest({ captureId: 7 }));

    expect(response.status).toBe(500);
    expect(mocks.getUserCapturesByIds).not.toHaveBeenCalled();
  });
});
