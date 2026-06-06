// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthUserAndTouch: vi.fn(),
  createClient: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthUserAndTouch: mocks.getAuthUserAndTouch,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

function imageRequest(path?: string) {
  const url = new URL('http://localhost/api/image');
  if (path !== undefined) {
    url.searchParams.set('path', path);
  }
  return new NextRequest(url);
}

describe('GET /api/image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/capture.png' },
      error: null,
    });
    mocks.createClient.mockResolvedValue({
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: mocks.createSignedUrl,
        })),
      },
    });
  });

  it('requires a path parameter', async () => {
    const { GET } = await import('@/app/api/image/route');
    const response = await GET(imageRequest());

    expect(response.status).toBe(400);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated image requests', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);

    const { GET } = await import('@/app/api/image/route');
    const response = await GET(imageRequest('user-1/capture.png'));

    expect(response.status).toBe(401);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('creates a signed URL for an image owned by the authenticated user', async () => {
    const { GET } = await import('@/app/api/image/route');
    const response = await GET(imageRequest('user-1/capture.png'));

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://signed.example/capture.png');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('user-1/capture.png', 3600);
  });

  it('rejects image paths outside the authenticated user folder', async () => {
    const { GET } = await import('@/app/api/image/route');
    const response = await GET(imageRequest('user-2/capture.png'));

    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('rejects traversal-looking image paths', async () => {
    const { GET } = await import('@/app/api/image/route');
    const response = await GET(imageRequest('user-1/../user-2/capture.png'));

    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('extracts owned storage paths from Supabase signed URLs', async () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/sign/captures/user-1/capture.png?token=abc';

    const { GET } = await import('@/app/api/image/route');
    const response = await GET(imageRequest(url));

    expect(response.status).toBe(307);
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('user-1/capture.png', 3600);
  });
});
