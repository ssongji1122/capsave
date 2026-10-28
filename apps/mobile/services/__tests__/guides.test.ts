import type { PublicGuide } from '@scrave/shared';
import {
  MAX_GUIDE_CAPTURES,
  MIN_GUIDE_CAPTURES,
  createMobileGuideDraft,
  moveMobileGuidePlace,
  removeMobileGuidePlace,
  saveMobileGuide,
  toggleGuideCaptureSelection,
} from '../guides';

const SAMPLE_GUIDE: PublicGuide = {
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
      practicalNote: '운영 시간 확인',
      references: [],
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
      visitWindow: '소품샵 직후',
      practicalNote: '웨이팅 확인',
      references: [],
    },
    {
      id: 'p3',
      sequence: 3,
      name: '서울숲 공원',
      localName: '서울숲 공원',
      category: 'activity',
      address: '서울 성동구 뚝섬로 273',
      coordinates: { latitude: 37.544, longitude: 127.037 },
      scene: '03 · 산책',
      summary: '공원 산책',
      visitWindow: '해 질 녘',
      practicalNote: '편한 신발',
      references: [],
    },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('mobile guides service and selection reducer', () => {
  it('toggles capture IDs and enforces the 10-capture upper bound', () => {
    let selected: number[] = [];
    selected = toggleGuideCaptureSelection(selected, 1).selectedIds;
    selected = toggleGuideCaptureSelection(selected, 2).selectedIds;
    expect(selected).toEqual([1, 2]);
    expect(selected.length).toBeGreaterThanOrEqual(MIN_GUIDE_CAPTURES);

    // Toggle off
    selected = toggleGuideCaptureSelection(selected, 1).selectedIds;
    expect(selected).toEqual([2]);

    // Cap at MAX_GUIDE_CAPTURES (10)
    const full = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const over = toggleGuideCaptureSelection(full, 11);
    expect(over.selectedIds).toHaveLength(MAX_GUIDE_CAPTURES);
    expect(over.limitReached).toBe(true);
  });

  it('requires login token and handles 401 when creating a guide draft', async () => {
    const fetchImpl = jest.fn();
    await expect(
      createMobileGuideDraft([1, 2], 0, {
        serverUrl: 'https://scrave.vercel.app',
        getToken: async () => null,
        fetchImpl,
      }),
    ).rejects.toThrow('로그인한 뒤 가이드를 만들 수 있습니다.');

    fetchImpl.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401));
    await expect(
      createMobileGuideDraft([1, 2], 0, {
        serverUrl: 'https://scrave.vercel.app',
        getToken: async () => 'expired-token',
        fetchImpl,
      }),
    ).rejects.toThrow('로그인한 뒤 가이드를 만들 수 있습니다.');
  });

  it('calls POST /api/guides/draft with Bearer token and parses the draft', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        guide: SAMPLE_GUIDE,
        fallback: false,
        unresolved: [],
        coverImageUrl: 'captures/u/1.jpg',
      }),
    );

    const res = await createMobileGuideDraft([10, 12], 1, {
      serverUrl: 'https://scrave.vercel.app',
      getToken: async () => 'token-abc',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://scrave.vercel.app/api/guides/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-abc',
      },
      body: JSON.stringify({ captureIds: [10, 12], nights: 1 }),
    });
    expect(res.guide.title).toBe('성수 반나절 동선');
  });

  it('reorders and removes places on mobile while preserving sequence numbers', () => {
    const moved = moveMobileGuidePlace(SAMPLE_GUIDE, 'p1', 1);
    expect(moved.places.map((p) => `${p.sequence}:${p.id}`)).toEqual([
      '1:p2',
      '2:p1',
      '3:p3',
    ]);

    const removed = removeMobileGuidePlace(moved, 'p2');
    expect(removed.places.map((p) => `${p.sequence}:${p.id}`)).toEqual([
      '1:p1',
      '2:p3',
    ]);
  });

  it('saves and shares a guide via POST /api/guides', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          guide: {
            id: 'guide-uuid-99',
            slug: SAMPLE_GUIDE.slug,
            visibility: 'unlisted',
            status: 'ready',
          },
        },
        201,
      ),
    );

    const saved = await saveMobileGuide(SAMPLE_GUIDE, 'unlisted', {
      serverUrl: 'https://scrave.vercel.app',
      getToken: async () => 'token-abc',
      fetchImpl,
    });

    expect(saved.id).toBe('guide-uuid-99');
    expect(saved.shareUrl).toBe(`https://scrave.vercel.app/g/${SAMPLE_GUIDE.slug}`);
  });
});
