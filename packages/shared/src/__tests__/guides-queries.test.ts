import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicGuide } from '../types/guide';
import {
  MAX_GUIDES_PER_USER,
  toShareableGuideBody,
  extractGuideSourceCaptureIds,
  saveGuide,
  listMyGuides,
  updateGuide,
  softDeleteGuide,
  getSharedGuideBySlug,
} from '../supabase/queries';

function makeSampleGuide(): PublicGuide {
  return {
    slug: 'my-guide-k3v9q2m7xa',
    status: 'draft',
    title: '성수 반나절 동선',
    eyebrow: 'MY GUIDE',
    description: '성수 카페와 소품샵 두 곳을 잇는 동선입니다.',
    location: '서울 성동구 연무장길',
    countryCode: 'KR',
    center: { latitude: 37.5446, longitude: 127.0557 },
    updatedAt: '2026-10-24',
    curator: 'Scrave 사용자 노트',
    routeEyebrow: 'ONE DAY · TWO PLACES',
    routeTitle: '성수 산책 동선',
    mapLabel: 'MY GUIDE',
    connectRoute: true,
    shareTitleLines: ['성수 반나절 동선'],
    places: [
      {
        id: 'p1',
        sequence: 1,
        name: '오브젝트 성수',
        localName: '오브젝트 성수',
        category: 'culture',
        address: '서울 성동구 연무장길 11',
        coordinates: { latitude: 37.5446, longitude: 127.0557 },
        scene: '01 · 오후의 소품 탐색',
        summary: '전시와 소품',
        visitWindow: '한산한 오후 시간대',
        practicalNote: '방문 직전 운영 시간을 다시 확인하세요.',
        references: [],
        sourceCaptureIds: [10, 12],
      },
      {
        id: 'p2',
        sequence: 2,
        name: '성수 로스터리',
        localName: '성수 로스터리',
        category: 'food',
        address: '서울 성동구 연무장길 25',
        coordinates: { latitude: 37.545, longitude: 127.056 },
        scene: '02 · 커피 휴식',
        summary: '드립 커피',
        visitWindow: '소품샵 둘러본 직후',
        practicalNote: '주말 웨이팅 여부를 확인하세요.',
        references: [],
        sourceCaptureIds: [12, 15],
      },
    ],
  };
}

describe('guides shared helpers and queries', () => {
  it('exposes MAX_GUIDES_PER_USER = 20 in sync with migration 014', () => {
    expect(MAX_GUIDES_PER_USER).toBe(20);
  });

  it('strips sourceCaptureIds from guide places in toShareableGuideBody and extracts unique IDs', () => {
    const guide = makeSampleGuide();
    const ids = extractGuideSourceCaptureIds(guide);
    expect(ids).toEqual([10, 12, 15]);

    const clean = toShareableGuideBody(guide);
    expect(clean.places[0]?.sourceCaptureIds).toBeUndefined();
    expect(clean.places[1]?.sourceCaptureIds).toBeUndefined();
    expect(clean.places[0]?.name).toBe('오브젝트 성수');
    // Original object is not mutated
    expect(guide.places[0]?.sourceCaptureIds).toEqual([10, 12]);
  });

  it('saves a guide with sanitized body and source_capture_ids', async () => {
    const guide = makeSampleGuide();
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'uuid-1',
        user_id: 'user-1',
        slug: guide.slug,
        title: guide.title,
        description: guide.description,
        body: { ...toShareableGuideBody(guide), status: 'ready' },
        schema_version: 1,
        status: 'ready',
        visibility: 'private',
        source_capture_ids: [10, 12, 15],
        generation: { fallback: false },
        shared_at: null,
        created_at: '2026-10-24T00:00:00Z',
        updated_at: '2026-10-24T00:00:00Z',
        deleted_at: null,
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const client = { from } as unknown as SupabaseClient;

    const saved = await saveGuide(client, 'user-1', {
      guide,
      status: 'ready',
      visibility: 'private',
      generation: { fallback: false },
    });

    expect(from).toHaveBeenCalledWith('guides');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        slug: guide.slug,
        title: guide.title,
        status: 'ready',
        visibility: 'private',
        source_capture_ids: [10, 12, 15],
      }),
    );
    expect(saved.id).toBe('uuid-1');
    expect(saved.body.places[0]?.sourceCaptureIds).toBeUndefined();
  });

  it('lists user guides ordered by updated_at descending', async () => {
    const guide = makeSampleGuide();
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'uuid-1',
          user_id: 'user-1',
          slug: guide.slug,
          title: guide.title,
          description: guide.description,
          body: toShareableGuideBody(guide),
          schema_version: 1,
          status: 'ready',
          visibility: 'unlisted',
          source_capture_ids: [10, 12],
          generation: {},
          shared_at: '2026-10-24T01:00:00Z',
          created_at: '2026-10-24T00:00:00Z',
          updated_at: '2026-10-24T01:00:00Z',
          deleted_at: null,
        },
      ],
      error: null,
    });
    const is = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ is }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as SupabaseClient;

    const list = await listMyGuides(client);
    expect(list).toHaveLength(1);
    expect(list[0]?.placeCount).toBe(2);
    expect(list[0]?.visibility).toBe('unlisted');
  });

  it('updates a guide and sets shared_at when visibility becomes unlisted', async () => {
    const guide = makeSampleGuide();
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'uuid-1',
        user_id: 'user-1',
        slug: guide.slug,
        title: guide.title,
        description: guide.description,
        body: { ...toShareableGuideBody(guide), status: 'ready' },
        schema_version: 1,
        status: 'ready',
        visibility: 'unlisted',
        source_capture_ids: [10, 12],
        generation: {},
        shared_at: '2026-10-24T02:00:00Z',
        created_at: '2026-10-24T00:00:00Z',
        updated_at: '2026-10-24T02:00:00Z',
        deleted_at: null,
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const is = vi.fn(() => ({ select }));
    const eq = vi.fn(() => ({ is }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const client = { from } as unknown as SupabaseClient;

    const updated = await updateGuide(client, 'uuid-1', {
      visibility: 'unlisted',
      status: 'ready',
    });

    expect(updated.visibility).toBe('unlisted');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: 'unlisted',
        status: 'ready',
      }),
    );
  });

  it('soft-deletes a guide by setting deleted_at', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const client = { from } as unknown as SupabaseClient;

    await softDeleteGuide(client, 'uuid-1');
    expect(from).toHaveBeenCalledWith('guides');
    expect(eq).toHaveBeenCalledWith('id', 'uuid-1');
  });

  it('fetches a shared guide via get_shared_guide RPC', async () => {
    const guide = toShareableGuideBody(makeSampleGuide());
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          slug: guide.slug,
          title: guide.title,
          description: guide.description,
          body: guide,
          updated_at: '2026-10-24T03:00:00Z',
        },
      ],
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;

    const result = await getSharedGuideBySlug(client, guide.slug);
    expect(rpc).toHaveBeenCalledWith('get_shared_guide', { p_slug: guide.slug });
    expect(result?.slug).toBe(guide.slug);
    expect(result?.status).toBe('published');
  });
});
