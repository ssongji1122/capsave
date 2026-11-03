// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  inspect: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ getAuthUserAndTouch: mocks.auth }));
vi.mock('@/lib/instagram-original', async () => {
  const actual = await vi.importActual<typeof import('@/lib/instagram-original')>(
    '@/lib/instagram-original'
  );
  return { ...actual, inspectInstagramOriginal: mocks.inspect };
});

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/social-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mediaRequest(src: string) {
  const url = new URL('http://localhost/api/social-link');
  url.searchParams.set('src', src);
  return new NextRequest(url);
}

describe('/api/social-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mocks.auth.mockResolvedValue({ id: 'owner' });
    mocks.inspect.mockResolvedValue({
      url: 'https://www.instagram.com/p/Abcd_12/',
      author: 'seoulpick',
      caption: '서울 카페 여행 기록',
      images: [{ url: 'https://scontent.cdninstagram.com/a.jpg', kind: 'image' }],
    });
  });

  it('requires authentication before inspecting a public post', async () => {
    mocks.auth.mockResolvedValue(null);
    const { POST } = await import('@/app/api/social-link/route');
    const response = await POST(postRequest({ url: 'https://instagram.com/p/Abcd_12/' }));
    expect(response.status).toBe(401);
    expect(mocks.inspect).not.toHaveBeenCalled();
  });

  it('rejects malformed or unsupported URLs before inspection', async () => {
    const { POST } = await import('@/app/api/social-link/route');
    const response = await POST(postRequest({ url: 'http://127.0.0.1/private' }));
    expect(response.status).toBe(400);
    expect(mocks.inspect).not.toHaveBeenCalled();
  });

  it('returns ordered captures with no-store caching', async () => {
    const { POST } = await import('@/app/api/social-link/route');
    const response = await POST(postRequest({ url: 'https://instagram.com/p/Abcd_12/' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.captures).toHaveLength(1);
    expect(body.captures[0].analysis.tags).toContain('검증 전');
  });

  it('returns recoverable guidance when the public embed is unavailable', async () => {
    mocks.inspect.mockRejectedValue(new Error('offline'));
    const { POST } = await import('@/app/api/social-link/route');
    const response = await POST(postRequest({ url: 'https://instagram.com/p/Abcd_12/' }));
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('공개 게시물');
  });

  it('proxies only trusted Instagram image hosts for an authenticated user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/jpeg', 'content-length': '3' },
        })
      )
    );
    const { GET } = await import('@/app/api/social-link/route');
    const response = await GET(mediaRequest('https://scontent.cdninstagram.com/a.jpg'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('rejects untrusted hosts and non-image upstream responses', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } })
    );
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('@/app/api/social-link/route');

    expect((await GET(mediaRequest('https://example.com/a.jpg'))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (await GET(mediaRequest('https://scontent.cdninstagram.com/a.jpg'))).status
    ).toBe(502);
  });
});
