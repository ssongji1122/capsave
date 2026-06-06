// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { MAX_ANALYZE_IMAGE_BASE64_LENGTH } from '@/lib/constants';

const mocks = vi.hoisted(() => ({
  getAuthUserAndTouch: vi.fn(),
  consumeGuestRateLimit: vi.fn(),
  countUserCaptures: vi.fn(),
  createSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthUserAndTouch: mocks.getAuthUserAndTouch,
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeGuestRateLimit: mocks.consumeGuestRateLimit,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createSupabaseClient,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock('@scrave/shared', async () => {
  const actual = await vi.importActual<typeof import('@scrave/shared')>('@scrave/shared');
  return {
    ...actual,
    countUserCaptures: mocks.countUserCaptures,
  };
});

function analyzeRequest(image = 'aW1hZ2U=') {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.7',
    },
    body: JSON.stringify({ image }),
  });
}

function invalidJsonAnalyzeRequest() {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid-json',
  });
}

function analyzeRequestWithRawBody(body: string) {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    mocks.consumeGuestRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: new Date('2026-05-20T23:59:59.999Z'),
    });
    mocks.countUserCaptures.mockResolvedValue(0);
    mocks.createSupabaseClient.mockReturnValue({});
  });

  it('rejects malformed JSON before rate-limit consumption and paid analysis', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze/route');
    const response = await POST(invalidJsonAnalyzeRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid JSON body');
    expect(mocks.consumeGuestRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects JSON null before rate-limit consumption and paid analysis', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze/route');
    const response = await POST(analyzeRequestWithRawBody('null'));

    expect(response.status).toBe(400);
    expect(mocks.consumeGuestRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks guests at the rate limit before paid analysis', async () => {
    mocks.consumeGuestRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date('2026-05-20T23:59:59.999Z'),
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze/route');
    const response = await POST(analyzeRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('일일 체험 한도를 초과했습니다');
    expect(mocks.consumeGuestRateLimit).toHaveBeenCalledWith('203.0.113.7');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects oversized images before rate-limit consumption and paid analysis', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze/route');
    const response = await POST(analyzeRequest('a'.repeat(MAX_ANALYZE_IMAGE_BASE64_LENGTH + 1)));

    expect(response.status).toBe(413);
    expect(mocks.consumeGuestRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid base64 images before rate-limit consumption and paid analysis', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze/route');
    const response = await POST(analyzeRequest('not-base64!'));

    expect(response.status).toBe(400);
    expect(mocks.consumeGuestRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed before paid analysis when authenticated free-limit check fails', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.countUserCaptures.mockRejectedValue(new Error('count failed'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze/route');
    const response = await POST(analyzeRequest());

    expect(response.status).toBe(500);
    expect(mocks.countUserCaptures).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a pending analysis result when Gemini rate limit is exhausted', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => 'quota exhausted',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/analyze/route');
    const response = await POST(analyzeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      category: 'text',
      title: '분석 대기 캡처',
      confidence: 0,
      sourceAccountId: null,
    });
    expect(mocks.consumeGuestRateLimit).toHaveBeenCalledWith('203.0.113.7');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
