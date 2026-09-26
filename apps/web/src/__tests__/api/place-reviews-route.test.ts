// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthUserAndTouch: vi.fn(),
  collectPlaceReviews: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthUserAndTouch: mocks.getAuthUserAndTouch,
}));

vi.mock('@/lib/place-review-sources', () => ({
  collectPlaceReviews: mocks.collectPlaceReviews,
}));

function reviewRequest(body: unknown) {
  return new NextRequest('http://localhost/api/place-reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/place-reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NAVER_CLIENT_ID = 'naver-id';
    process.env.NAVER_CLIENT_SECRET = 'naver-secret';
    process.env.YOUTUBE_API_KEY = 'yt-key';
    process.env.GEMINI_API_KEY = 'gemini-key';
  });

  it('rejects a missing place name before auth', async () => {
    const { POST } = await import('@/app/api/place-reviews/route');
    const response = await POST(reviewRequest({ name: '  ' }));

    expect(response.status).toBe(400);
    expect(mocks.getAuthUserAndTouch).not.toHaveBeenCalled();
  });

  it('rejects very long names', async () => {
    const { POST } = await import('@/app/api/place-reviews/route');
    const response = await POST(reviewRequest({ name: 'a'.repeat(121) }));

    expect(response.status).toBe(400);
  });

  it('requires a signed-in user', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const { POST } = await import('@/app/api/place-reviews/route');
    const response = await POST(reviewRequest({ name: '아난타라 울루와뚜' }));

    expect(response.status).toBe(401);
    expect(mocks.collectPlaceReviews).not.toHaveBeenCalled();
  });

  it('collects reviews with the server keys', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.collectPlaceReviews.mockResolvedValue({ naver: { status: 'ok' }, youtube: { status: 'ok' } });
    const { POST } = await import('@/app/api/place-reviews/route');
    const response = await POST(reviewRequest({ name: ' 아난타라 울루와뚜 ' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ naver: { status: 'ok' }, youtube: { status: 'ok' } });
    expect(mocks.collectPlaceReviews).toHaveBeenCalledWith('아난타라 울루와뚜', {
      naverClientId: 'naver-id',
      naverClientSecret: 'naver-secret',
      youtubeApiKey: 'yt-key',
      geminiApiKey: 'gemini-key',
    });
  });
});
