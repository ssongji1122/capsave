// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthUserAndTouch: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthUserAndTouch: mocks.getAuthUserAndTouch,
}));

function geocodeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function invalidJsonGeocodeRequest() {
  return new NextRequest('http://localhost/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid-json',
  });
}

function geocodeRequestWithRawBody(body: string) {
  return new NextRequest('http://localhost/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('POST /api/geocode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-google-key';
  });

  it('rejects malformed JSON before requiring auth or external geocoding', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/geocode/route');
    const response = await POST(invalidJsonGeocodeRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid JSON body');
    expect(mocks.getAuthUserAndTouch).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects JSON null before requiring auth or external geocoding', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/geocode/route');
    const response = await POST(geocodeRequestWithRawBody('null'));

    expect(response.status).toBe(400);
    expect(mocks.getAuthUserAndTouch).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects valid geocoding input from unauthenticated users before external API calls', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/geocode/route');
    const response = await POST(geocodeRequest({ name: '서울시청', address: '서울특별시 중구' }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns validation errors before requiring auth', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/geocode/route');
    const response = await POST(geocodeRequest({}));

    expect(response.status).toBe(400);
    expect(mocks.getAuthUserAndTouch).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
