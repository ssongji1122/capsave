// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { MAX_ANALYZE_IMAGE_BASE64_LENGTH } from '@/lib/constants';

const mocks = vi.hoisted(() => ({
  getAuthUserAndTouch: vi.fn(),
  countUserCaptures: vi.fn(),
  createClient: vi.fn(),
  consumeGuestRateLimit: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthUserAndTouch: mocks.getAuthUserAndTouch,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeGuestRateLimit: mocks.consumeGuestRateLimit,
}));

vi.mock('@scrave/shared', async () => {
  const actual = await vi.importActual<typeof import('@scrave/shared')>('@scrave/shared');
  return {
    ...actual,
    countUserCaptures: mocks.countUserCaptures,
  };
});

function analyzeBatchRequest(images: string[]) {
  return new NextRequest('http://localhost/api/analyze-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images }),
  });
}

function invalidJsonAnalyzeBatchRequest() {
  return new NextRequest('http://localhost/api/analyze-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid-json',
  });
}

function analyzeBatchRequestWithRawBody(body: string) {
  return new NextRequest('http://localhost/api/analyze-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('POST /api/analyze-batch', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.countUserCaptures.mockResolvedValue(9);
    mocks.createClient.mockReturnValue({});
    mocks.consumeGuestRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 3,
      resetAt: new Date('2026-05-20T23:59:59.999Z'),
    });
  });

  it('rejects malformed JSON before rate-limit consumption and paid analysis', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze-batch/route');
    const response = await POST(invalidJsonAnalyzeBatchRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid JSON body');
    expect(mocks.consumeGuestRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects JSON null before rate-limit consumption and paid analysis', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze-batch/route');
    const response = await POST(analyzeBatchRequestWithRawBody('null'));

    expect(response.status).toBe(400);
    expect(mocks.consumeGuestRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows multiple source images when remaining capacity can fit a merged result', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    category: 'place',
                    title: '병합된 장소',
                    summary: '두 장이 하나의 장소 정보로 병합되었습니다.',
                    places: [{ name: '테스트 카페' }],
                    extractedText: '',
                    links: [],
                    tags: ['테스트'],
                    source: 'other',
                    confidence: 0.9,
                    sourceAccountId: null,
                    sourceIndices: [0, 1],
                  }),
                },
              ],
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze-batch/route');
    const response = await POST(analyzeBatchRequest(['aW1hZ2Ux', 'aW1hZ2Uy']));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].sourceIndices).toEqual([0, 1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('consumes guest quota by source image count before paid analysis', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    {
                      category: 'text',
                      title: '첫 번째 텍스트',
                      summary: '첫 번째 분석 결과입니다.',
                      places: [],
                      extractedText: '첫 번째',
                      links: [],
                      tags: ['테스트'],
                      source: 'other',
                      confidence: 0.9,
                      sourceAccountId: null,
                      sourceIndices: [0],
                    },
                    {
                      category: 'text',
                      title: '두 번째 텍스트',
                      summary: '두 번째 분석 결과입니다.',
                      places: [],
                      extractedText: '두 번째',
                      links: [],
                      tags: ['테스트'],
                      source: 'other',
                      confidence: 0.9,
                      sourceAccountId: null,
                      sourceIndices: [1],
                    },
                  ]),
                },
              ],
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze-batch/route');
    const response = await POST(analyzeBatchRequest(['aW1hZ2Ux', 'aW1hZ2Uy']));

    expect(response.status).toBe(200);
    expect(mocks.consumeGuestRateLimit).toHaveBeenCalledWith('unknown', 2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks guests at the rate limit before paid batch analysis', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    mocks.consumeGuestRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date('2026-05-20T23:59:59.999Z'),
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze-batch/route');
    const response = await POST(analyzeBatchRequest(['aW1hZ2Ux', 'aW1hZ2Uy']));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('일일 체험 한도를 초과했습니다');
    expect(mocks.consumeGuestRateLimit).toHaveBeenCalledWith('unknown', 2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects oversized batch images before rate-limit consumption and paid analysis', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze-batch/route');
    const response = await POST(analyzeBatchRequest(['a'.repeat(MAX_ANALYZE_IMAGE_BASE64_LENGTH + 1)]));

    expect(response.status).toBe(413);
    expect(mocks.consumeGuestRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid base64 batch images before rate-limit consumption and paid analysis', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze-batch/route');
    const response = await POST(analyzeBatchRequest(['dGVzdA==', 'not-base64!']));

    expect(response.status).toBe(400);
    expect(mocks.consumeGuestRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed before paid batch analysis when authenticated free-limit service credentials are missing', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze-batch/route');
    const response = await POST(analyzeBatchRequest(['aW1hZ2Ux']));

    expect(response.status).toBe(500);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.countUserCaptures).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
