// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { MAX_FREE_CAPTURES } from '@scrave/shared';
import { UPLOAD_EMPTY_ERROR } from '@/lib/upload-validation';

const mocks = vi.hoisted(() => ({
  getAuthUserAndTouch: vi.fn(),
  createClient: vi.fn(),
  countUserCaptures: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthUserAndTouch: mocks.getAuthUserAndTouch,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

vi.mock('@scrave/shared', async () => {
  const actual = await vi.importActual<typeof import('@scrave/shared')>('@scrave/shared');
  return {
    ...actual,
    countUserCaptures: mocks.countUserCaptures,
  };
});

function uploadRequest(file?: File) {
  const form = new FormData();
  if (file) {
    form.append('file', file);
  }
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: form,
  });
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.countUserCaptures.mockResolvedValue(0);
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      storage: {
        from: vi.fn(() => ({
          upload: mocks.upload,
          remove: mocks.remove,
        })),
      },
    });
  });

  it('returns file validation errors before creating the storage client', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(uploadRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('No file provided');
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('uploads a valid image after validation', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'capture.png', { type: 'image/png' });
    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(uploadRequest(file));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.path).toMatch(/^user-1\/.+\.png$/);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  it('rejects empty image files before creating the storage client', async () => {
    const file = new File([], 'empty.png', { type: 'image/png' });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(uploadRequest(file));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(UPLOAD_EMPTY_ERROR);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('rejects users at the free capture limit before storage upload', async () => {
    mocks.countUserCaptures.mockResolvedValue(MAX_FREE_CAPTURES);
    const file = new File([new Uint8Array([1, 2, 3])], 'capture.png', { type: 'image/png' });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('fails closed before storage upload when free-limit check fails', async () => {
    mocks.countUserCaptures.mockRejectedValue(new Error('count failed'));
    const file = new File([new Uint8Array([1, 2, 3])], 'capture.png', { type: 'image/png' });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(500);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});

function deleteRequest(paths: unknown) {
  return new NextRequest('http://localhost/api/upload', {
    method: 'DELETE',
    body: JSON.stringify({ paths }),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('DELETE /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      storage: {
        from: vi.fn(() => ({
          remove: mocks.remove,
        })),
      },
    });
  });

  it('rejects unauthenticated cleanup requests', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);

    const { DELETE } = await import('@/app/api/upload/route');
    const response = await DELETE(deleteRequest(['user-1/capture.png']));

    expect(response.status).toBe(401);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('deletes only paths owned by the authenticated user', async () => {
    const { DELETE } = await import('@/app/api/upload/route');
    const response = await DELETE(deleteRequest(['user-1/capture.png']));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deleted).toEqual(['user-1/capture.png']);
    expect(mocks.remove).toHaveBeenCalledWith(['user-1/capture.png']);
  });

  it('rejects cleanup paths outside the authenticated user folder', async () => {
    const { DELETE } = await import('@/app/api/upload/route');
    const response = await DELETE(deleteRequest(['user-2/capture.png']));

    expect(response.status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
