import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ULUWATU_CAPTURE_GUIDE } from '@/lib/public-guides';

const mocks = vi.hoisted(() => ({
  getAuthUserAndTouch: vi.fn(),
  createClient: vi.fn(),
  listMyGuides: vi.fn(),
  saveGuide: vi.fn(),
  getMyGuideById: vi.fn(),
  updateGuide: vi.fn(),
  softDeleteGuide: vi.fn(),
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
    listMyGuides: mocks.listMyGuides,
    saveGuide: mocks.saveGuide,
    getMyGuideById: mocks.getMyGuideById,
    updateGuide: mocks.updateGuide,
    softDeleteGuide: mocks.softDeleteGuide,
  };
});

import { GET as listRoute, POST as createRoute } from '@/app/api/guides/route';
import {
  GET as getByIdRoute,
  PATCH as updateRoute,
  DELETE as deleteRoute,
} from '@/app/api/guides/[id]/route';

const sampleDraft = {
  ...ULUWATU_CAPTURE_GUIDE,
  slug: 'my-guide-k3v9q2m7xa',
  status: 'draft' as const,
};

describe('/api/guides and /api/guides/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({});
  });

  it('returns 401 on GET /api/guides when unauthenticated', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/guides');
    const res = await listRoute(req);
    expect(res.status).toBe(401);
  });

  it('creates a guide on POST /api/guides and enforces 20 guide cap', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.listMyGuides.mockResolvedValueOnce([]);
    mocks.saveGuide.mockResolvedValueOnce({
      id: 'guide-uuid-1',
      slug: sampleDraft.slug,
      title: sampleDraft.title,
      visibility: 'private',
      status: 'ready',
    });

    const req = new NextRequest('http://localhost/api/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guide: sampleDraft, status: 'ready', visibility: 'private' }),
    });
    const res = await createRoute(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.guide.id).toBe('guide-uuid-1');

    // Enforce cap of 20
    mocks.listMyGuides.mockResolvedValueOnce(new Array(20).fill({ id: 'x' }));
    const reqCap = new NextRequest('http://localhost/api/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guide: sampleDraft }),
    });
    const resCap = await createRoute(reqCap);
    expect(resCap.status).toBe(422);
  });

  it('updates visibility on PATCH /api/guides/[id] and soft-deletes on DELETE', async () => {
    mocks.getAuthUserAndTouch.mockResolvedValue({ id: 'user-1' });
    mocks.updateGuide.mockResolvedValueOnce({
      id: 'guide-uuid-1',
      slug: sampleDraft.slug,
      visibility: 'unlisted',
      status: 'ready',
    });

    const patchReq = new NextRequest('http://localhost/api/guides/guide-uuid-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: 'unlisted', status: 'ready' }),
    });
    const patchRes = await updateRoute(patchReq, {
      params: Promise.resolve({ id: 'guide-uuid-1' }),
    });
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.guide.visibility).toBe('unlisted');

    mocks.softDeleteGuide.mockResolvedValueOnce(undefined);
    const delReq = new NextRequest('http://localhost/api/guides/guide-uuid-1', {
      method: 'DELETE',
    });
    const delRes = await deleteRoute(delReq, {
      params: Promise.resolve({ id: 'guide-uuid-1' }),
    });
    expect(delRes.status).toBe(200);
    expect(mocks.softDeleteGuide).toHaveBeenCalledWith({}, 'guide-uuid-1');

    mocks.getMyGuideById.mockResolvedValueOnce(null);
    const getReq = new NextRequest('http://localhost/api/guides/guide-uuid-1');
    const getRes = await getByIdRoute(getReq, {
      params: Promise.resolve({ id: 'guide-uuid-1' }),
    });
    expect(getRes.status).toBe(404);
  });
});
