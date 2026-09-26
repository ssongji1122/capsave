// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { CaptureItem } from '@scrave/shared';

const mocks = vi.hoisted(() => ({
  getAuthUserAndTouch: vi.fn(),
  createClient: vi.fn(),
  getUserCapturesByIds: vi.fn(),
  createGuideModelCaller: vi.fn(),
  consumeGuideDraftLimit: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ getAuthUserAndTouch: mocks.getAuthUserAndTouch }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/rate-limit', () => ({
  GUIDE_DRAFT_DAILY_LIMIT: 5,
  consumeGuideDraftLimit: mocks.consumeGuideDraftLimit,
}));
vi.mock('@/lib/guide-draft-sources', () => ({
  getUserCapturesByIds: mocks.getUserCapturesByIds,
  createGuideModelCaller: mocks.createGuideModelCaller,
}));

function capture(id: number, places: CaptureItem['places']): CaptureItem {
  return {
    id,
    category: 'place',
    title: `캡처 ${id}`,
    summary: '요약',
    places,
    extractedText: '',
    links: [],
    tags: [],
    source: 'instagram',
    imageUrl: `captures/u/${id}.jpg`,
    createdAt: '2026-09-20T00:00:00Z',
    userId: 'user-1',
    confidence: 0.9,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  };
}

const CAPTURES = [
  capture(1, [{ name: 'Padang Padang Beach', lat: -8.8112, lng: 115.1036 }]),
  capture(2, [{ name: 'Single Fin', lat: -8.815, lng: 115.0889 }]),
];

function draftRequest(body: unknown) {
  return new NextRequest('http://localhost/api/guides/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/guides/draft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'gemini-key';
    mocks.createClient.mockResolvedValue({});
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.getUserCapturesByIds.mockResolvedValue(CAPTURES);
    mocks.createGuideModelCaller.mockReturnValue(null);
    mocks.consumeGuideDraftLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: new Date('2026-09-26T23:59:59.999Z'),
    });
  });

  it('rejects bad input before auth', async () => {
    const { POST } = await import('@/app/api/guides/draft/route');
    const response = await POST(draftRequest({ captureIds: [1] }));
    expect(response.status).toBe(400);
    expect(mocks.getAuthUserAndTouch).not.toHaveBeenCalled();
  });

  it('requires a signed-in user', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const { POST } = await import('@/app/api/guides/draft/route');
    const response = await POST(draftRequest({ captureIds: [1, 2] }));
    expect(response.status).toBe(401);
    expect(mocks.getUserCapturesByIds).not.toHaveBeenCalled();
  });

  it('rejects captures the user does not own without saying which', async () => {
    mocks.getUserCapturesByIds.mockResolvedValue([CAPTURES[0]]);
    const { POST } = await import('@/app/api/guides/draft/route');
    const response = await POST(draftRequest({ captureIds: [1, 99] }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Some captures are not available' });
    expect(mocks.getUserCapturesByIds).toHaveBeenCalledWith({}, 'user-1', [1, 99]);
  });

  it('returns a model-ordered draft', async () => {
    mocks.createGuideModelCaller.mockReturnValue(async () =>
      JSON.stringify({
        title: '울루와뚜 두 곳',
        description: '해변에서 절벽 바로 이어집니다.',
        eyebrow: 'BALI',
        routeTitle: '낮에서 밤으로',
        countryCode: 'ID',
        order: [
          { id: 'p2', day: 1, category: 'food', scene: '01 · 노을', visitWindow: '해 지기 전', practicalNote: '좌석은 방문 직전 다시 확인하세요.' },
          { id: 'p1', day: 1, category: 'beach', scene: '02 · 물빛', visitWindow: '오전', practicalNote: '계단 상태를 다시 확인하세요.' },
        ],
      })
    );
    const { POST } = await import('@/app/api/guides/draft/route');
    const response = await POST(draftRequest({ captureIds: [1, 2], nights: 0 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createGuideModelCaller).toHaveBeenCalledWith('gemini-key');
    expect(body.fallback).toBe(false);
    expect(body.coverImageUrl).toBe('captures/u/1.jpg');
    expect(body.guide.status).toBe('draft');
    expect(body.guide.slug).toMatch(/^my-guide-[a-z0-9]{10}$/);
    expect(body.guide.places.map((place: { name: string }) => place.name)).toEqual([
      'Single Fin',
      'Padang Padang Beach',
    ]);
  });

  it('falls back to distance order without a model', async () => {
    const { POST } = await import('@/app/api/guides/draft/route');
    const response = await POST(draftRequest({ captureIds: [1, 2] }));
    expect(response.status).toBe(200);
    expect((await response.json()).fallback).toBe(true);
  });

  it('explains when there are not enough places with a location', async () => {
    mocks.getUserCapturesByIds.mockResolvedValue([CAPTURES[0], capture(2, [{ name: '좌표 없음' }])]);
    const { POST } = await import('@/app/api/guides/draft/route');
    const response = await POST(draftRequest({ captureIds: [1, 2] }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'not-enough-places',
      unresolved: [{ name: '좌표 없음', captureId: 2 }],
    });
  });

  it('returns 500 when the captures cannot be read', async () => {
    mocks.getUserCapturesByIds.mockRejectedValue(new Error('db down'));
    const { POST } = await import('@/app/api/guides/draft/route');
    const response = await POST(draftRequest({ captureIds: [1, 2] }));
    expect(response.status).toBe(500);
  });

  it('returns 429 with what is left and when it resets once the daily limit is used up', async () => {
    const model = vi.fn();
    mocks.createGuideModelCaller.mockReturnValue(model);
    mocks.consumeGuideDraftLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date('2026-09-26T23:59:59.999Z'),
    });
    const { POST } = await import('@/app/api/guides/draft/route');
    const response = await POST(draftRequest({ captureIds: [1, 2] }));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: 'daily-limit',
      limit: 5,
      remaining: 0,
      resetAt: '2026-09-26T23:59:59.999Z',
    });
    expect(mocks.consumeGuideDraftLimit).toHaveBeenCalledWith('user-1');
    expect(model).not.toHaveBeenCalled();
  });

  it('counts a draft against the limit before the model is called', async () => {
    const order: string[] = [];
    mocks.consumeGuideDraftLimit.mockImplementation(async () => {
      order.push('limit');
      return { allowed: true, remaining: 4, resetAt: new Date('2026-09-26T23:59:59.999Z') };
    });
    mocks.createGuideModelCaller.mockReturnValue(async () => {
      order.push('model');
      return null;
    });
    const { POST } = await import('@/app/api/guides/draft/route');
    const response = await POST(draftRequest({ captureIds: [1, 2] }));

    expect(response.status).toBe(200);
    expect(order).toEqual(['limit', 'model', 'model']);
  });

  it('does not count requests that fail input checks', async () => {
    const { POST } = await import('@/app/api/guides/draft/route');

    await POST(draftRequest({ captureIds: [1] }));
    mocks.getUserCapturesByIds.mockResolvedValueOnce([CAPTURES[0]]);
    await POST(draftRequest({ captureIds: [1, 99] }));
    mocks.getUserCapturesByIds.mockResolvedValueOnce([CAPTURES[0], capture(2, [{ name: '좌표 없음' }])]);
    await POST(draftRequest({ captureIds: [1, 2] }));
    mocks.getAuthUserAndTouch.mockResolvedValueOnce(null);
    await POST(draftRequest({ captureIds: [1, 2] }));

    expect(mocks.consumeGuideDraftLimit).not.toHaveBeenCalled();
  });
});
