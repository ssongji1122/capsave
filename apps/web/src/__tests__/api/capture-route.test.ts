// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { UPLOAD_EMPTY_ERROR } from '@/lib/upload-validation';

const mocks = vi.hoisted(() => {
  return {
    upload: vi.fn(),
    getAuthUserAndTouch: vi.fn(),
    countUserCaptures: vi.fn(),
  };
});

vi.mock('@/lib/api-auth', () => ({
  getAuthUserAndTouch: mocks.getAuthUserAndTouch,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    storage: {
      from: vi.fn(() => ({
        upload: mocks.upload,
      })),
    },
  })),
}));

vi.mock('@scrave/shared', async () => {
  const actual = await vi.importActual<typeof import('@scrave/shared')>('@scrave/shared');
  return {
    ...actual,
    countUserCaptures: mocks.countUserCaptures,
  };
});

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

function createCaptureRequest(file = new File([TINY_PNG], 'capture.png', { type: 'image/png' })) {
  const form = new FormData();
  form.append('file', file);
  return new NextRequest('http://localhost/api/capture', {
    method: 'POST',
    body: form,
  });
}

function createEmptyCaptureRequest() {
  return new NextRequest('http://localhost/api/capture', {
    method: 'POST',
    body: new FormData(),
  });
}

describe('POST /api/capture', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.countUserCaptures.mockResolvedValue(0);
  });

  it('returns file validation errors before API key or free-limit checks', async () => {
    delete process.env.GEMINI_API_KEY;

    const { POST } = await import('@/app/api/capture/route');
    const response = await POST(createEmptyCaptureRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('No file provided');
    expect(mocks.countUserCaptures).not.toHaveBeenCalled();
  });

  it('rejects empty image files before paid analysis and storage upload', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const file = new File([], 'empty.png', { type: 'image/png' });

    const { POST } = await import('@/app/api/capture/route');
    const response = await POST(createCaptureRequest(file));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(UPLOAD_EMPTY_ERROR);
    expect(mocks.countUserCaptures).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('rejects users at the free capture limit before paid analysis and storage upload', async () => {
    mocks.countUserCaptures.mockResolvedValue(10);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/capture/route');
    const response = await POST(createCaptureRequest());

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('fails closed before paid analysis and storage upload when free-limit service credentials are missing', async () => {
    mocks.countUserCaptures.mockRejectedValue(new Error('count failed'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/capture/route');
    const response = await POST(createCaptureRequest());

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('does not upload the original image when Gemini analysis fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 502,
      text: async () => 'Gemini unavailable',
    })));

    const { POST } = await import('@/app/api/capture/route');
    const response = await POST(createCaptureRequest());

    expect(response.status).toBe(502);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('uploads the original image with a pending result when Gemini rate limit is exhausted', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => 'quota exhausted',
    })));

    const { POST } = await import('@/app/api/capture/route');
    const response = await POST(createCaptureRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result).toMatchObject({
      category: 'text',
      title: '분석 대기 캡처',
      confidence: 0,
      sourceAccountId: null,
    });
    expect(body.storagePath).toMatch(/^user-1\/.+\.png$/);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  it('uploads the original image only after Gemini returns a valid result', async () => {
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
                    title: '테스트 장소',
                    summary: '분석 결과',
                    places: [{ name: '테스트 카페' }],
                    extractedText: '',
                    links: [],
                    tags: ['테스트'],
                    source: 'other',
                    confidence: 0.9,
                  }),
                },
              ],
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/capture/route');
    const response = await POST(createCaptureRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.title).toBe('테스트 장소');
    expect(body.storagePath).toMatch(/^user-1\/.+\.png$/);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.upload.mock.invocationCallOrder[0]
    );
  });
});
