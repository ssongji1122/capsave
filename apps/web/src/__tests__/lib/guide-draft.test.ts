import { describe, expect, it } from 'vitest';
import type { CaptureItem, PlaceReviewResult } from '@scrave/shared';
import {
  GUIDE_DRAFT_CURATOR,
  MAX_GUIDE_PLACES,
  assembleGuideDraft,
  buildFallbackPlan,
  buildGuideSlug,
  collectGuideCandidates,
  createGuideDraft,
  guessCountryCode,
  orderByNearestNeighbor,
  parseGuideDraftResponse,
  toGuideReferences,
  validateGuideDraftInput,
  type GuideCandidate,
  type GuidePlan,
} from '@/lib/guide-draft';

function capture(overrides: Partial<CaptureItem>): CaptureItem {
  return {
    id: 1,
    category: 'place',
    title: '캡처',
    summary: '요약',
    places: [],
    extractedText: '',
    links: [],
    tags: [],
    source: 'instagram',
    imageUrl: 'https://example.supabase.co/storage/v1/object/captures/u/1.jpg',
    createdAt: '2026-09-20T00:00:00Z',
    userId: 'user-1',
    confidence: 0.9,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
    ...overrides,
  };
}

const BEACH = { name: 'Padang Padang Beach', address: 'Pecatu, Bali', lat: -8.8112, lng: 115.1036 };
const TEMPLE = { name: 'Uluwatu Temple', address: 'Pecatu, Bali', lat: -8.8294, lng: 115.0843 };
const BAR = { name: 'Single Fin', address: 'Suluban, Bali', lat: -8.815, lng: 115.0889 };

function candidate(id: string, name: string, lat: number, lng: number): GuideCandidate {
  return {
    id,
    name,
    address: `${name} address`,
    coordinates: { latitude: lat, longitude: lng },
    links: [],
    captureNote: `${name} 메모`,
    sourceCaptureIds: [Number(id.slice(1))],
  };
}

const CANDIDATES = [
  candidate('p1', 'Padang Padang Beach', BEACH.lat, BEACH.lng),
  candidate('p2', 'Uluwatu Temple', TEMPLE.lat, TEMPLE.lng),
  candidate('p3', 'Single Fin', BAR.lat, BAR.lng),
];

function validResponse(ids = ['p1', 'p2', 'p3']) {
  return JSON.stringify({
    title: '울루와뚜, 저장한 세 곳',
    description: '해변에서 시작해 절벽의 노을로 이어집니다.',
    eyebrow: 'BALI · ULUWATU',
    routeTitle: '낮에서 밤으로',
    countryCode: 'ID',
    order: ids.map((id, index) => ({
      id,
      day: 1,
      category: index === 0 ? 'beach' : index === 1 ? 'culture' : 'food',
      scene: `0${index + 1} · 장면`,
      visitWindow: '해 지기 1시간 전',
      practicalNote: '방문 직전 공식 안내에서 다시 확인하세요.',
    })),
  });
}

describe('validateGuideDraftInput', () => {
  it('accepts 2 to 10 unique capture ids and nights 0 to 7', () => {
    expect(validateGuideDraftInput({ captureIds: [3, 4], nights: 2 })).toEqual({
      valid: true,
      captureIds: [3, 4],
      nights: 2,
    });
    expect(validateGuideDraftInput({ captureIds: [3, 4] })).toMatchObject({ valid: true, nights: 0 });
  });

  it.each([
    [{ captureIds: [1] }],
    [{ captureIds: Array.from({ length: 11 }, (_, i) => i + 1) }],
    [{ captureIds: [1, 1] }],
    [{ captureIds: [1, -2] }],
    [{ captureIds: ['1', '2'] }],
    [{ captureIds: [1, 2], nights: 8 }],
    [{ captureIds: [1, 2], nights: 1.5 }],
    [null],
  ])('rejects %j', (body) => {
    expect(validateGuideDraftInput(body).valid).toBe(false);
  });
});

describe('collectGuideCandidates', () => {
  it('merges the same place from two captures and keeps both capture ids', () => {
    const result = collectGuideCandidates([
      capture({ id: 10, places: [BEACH], summary: '첫 캡처' }),
      capture({ id: 11, places: [{ ...BEACH, name: 'padang padang beach' }] }),
    ]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sourceCaptureIds).toEqual([10, 11]);
    expect(result.candidates[0]?.captureNote).toBe('첫 캡처');
  });

  it('merges differently named places within 50 m', () => {
    const result = collectGuideCandidates([
      capture({ id: 1, places: [BEACH] }),
      capture({ id: 2, places: [{ name: '빠당빠당 비치', lat: BEACH.lat + 0.0002, lng: BEACH.lng }] }),
    ]);
    expect(result.candidates).toHaveLength(1);
  });

  it('ignores text captures and splits places without coordinates', () => {
    const result = collectGuideCandidates([
      capture({ id: 1, places: [BEACH, { name: '좌표 없는 카페' }] }),
      capture({ id: 2, category: 'text', places: [TEMPLE] }),
    ]);
    expect(result.candidates.map(({ name }) => name)).toEqual(['Padang Padang Beach']);
    expect(result.unresolved).toEqual([{ name: '좌표 없는 카페', captureId: 1 }]);
  });

  it('gives candidates stable ids and keeps capture links', () => {
    const result = collectGuideCandidates([
      capture({ id: 1, places: [{ ...BEACH, links: ['https://example.com/beach'] }, TEMPLE] }),
    ]);
    expect(result.candidates.map(({ id }) => id)).toEqual(['p1', 'p2']);
    expect(result.candidates[0]?.links).toEqual(['https://example.com/beach']);
  });

  it('reports too many places', () => {
    const places = Array.from({ length: MAX_GUIDE_PLACES + 1 }, (_, i) => ({
      name: `장소 ${i}`,
      lat: 37 + i * 0.01,
      lng: 127,
    }));
    expect(collectGuideCandidates([capture({ places })]).tooMany).toBe(true);
  });
});

describe('orderByNearestNeighbor', () => {
  it('starts at the first place and hops to the closest next place', () => {
    expect(orderByNearestNeighbor(CANDIDATES).map(({ id }) => id)).toEqual(['p1', 'p3', 'p2']);
  });

  it('works with a single place', () => {
    expect(orderByNearestNeighbor([CANDIDATES[0]!])).toHaveLength(1);
  });
});

describe('parseGuideDraftResponse', () => {
  const ids = ['p1', 'p2', 'p3'];

  it('accepts a valid response, including one wrapped in a code block', () => {
    const plan = parseGuideDraftResponse(`\`\`\`json\n${validResponse()}\n\`\`\``, ids);
    expect(plan?.order.map(({ id }) => id)).toEqual(ids);
    expect(plan?.countryCode).toBe('ID');
  });

  it.each([
    ['a missing id', validResponse(['p1', 'p2'])],
    ['a duplicate id', validResponse(['p1', 'p2', 'p2'])],
    ['an unknown id', validResponse(['p1', 'p2', 'p9'])],
    ['empty text', ''],
    ['not JSON', '순서를 정할 수 없습니다'],
  ])('rejects %s', (_label, text) => {
    expect(parseGuideDraftResponse(text, ids)).toBeNull();
  });

  it.each([
    ['an unknown category', { category: 'nightlife' }],
    ['a clock time', { visitWindow: '17:30 도착' }],
    ['a price', { practicalNote: '입장료 50,000 루피아를 준비하세요.' }],
    ['a won price', { practicalNote: '1인 3만원 정도입니다.' }],
    ['a phone number', { practicalNote: '0361-123-4567로 예약하세요.' }],
    ['an empty scene', { scene: '' }],
  ])('rejects %s', (_label, patch) => {
    const data = JSON.parse(validResponse());
    data.order[0] = { ...data.order[0], ...patch };
    expect(parseGuideDraftResponse(JSON.stringify(data), ids)).toBeNull();
  });

  it('falls back to safe labels for a bad eyebrow or country code', () => {
    const data = JSON.parse(validResponse());
    data.eyebrow = '<script>';
    data.countryCode = 'Indonesia';
    const plan = parseGuideDraftResponse(JSON.stringify(data), ids);
    expect(plan?.eyebrow).toBe('MY GUIDE');
    expect(plan?.countryCode).toBeNull();
  });
});

describe('guessCountryCode', () => {
  it('reads Korea from coordinates and marks other places as unknown', () => {
    expect(guessCountryCode([{ latitude: 37.56, longitude: 126.97 }])).toBe('KR');
    expect(guessCountryCode([{ latitude: -8.81, longitude: 115.1 }])).toBe('ZZ');
  });
});

describe('assembleGuideDraft', () => {
  const plan = parseGuideDraftResponse(validResponse(['p2', 'p1', 'p3']), ['p1', 'p2', 'p3'])!;
  const guide = assembleGuideDraft(CANDIDATES, plan, {
    slug: 'my-guide-abc',
    nights: 0,
    now: new Date('2026-09-26T09:00:00Z'),
  });

  it('builds a draft guide in the planned order', () => {
    expect(guide.status).toBe('draft');
    expect(guide.slug).toBe('my-guide-abc');
    expect(guide.curator).toBe(GUIDE_DRAFT_CURATOR);
    expect(guide.places.map(({ name }) => name)).toEqual([
      'Uluwatu Temple',
      'Padang Padang Beach',
      'Single Fin',
    ]);
    expect(guide.places.map(({ sequence }) => sequence)).toEqual([1, 2, 3]);
    expect(guide.updatedAt).toBe('2026-09-26');
  });

  it('never fills opening hours and keeps source capture ids', () => {
    for (const place of guide.places) {
      expect(place.hours).toBeUndefined();
      expect(place.sourceCaptureIds?.length).toBe(1);
    }
  });

  it('connects the route on a one-day trip and centers the map on the places', () => {
    expect(guide.connectRoute).toBe(true);
    expect(guide.center.latitude).toBeCloseTo((BEACH.lat + TEMPLE.lat + BAR.lat) / 3, 5);
    expect(guide.countryCode).toBe('ID');
    expect(guide.routeEyebrow).toBe('ONE DAY · THREE PLACES');
  });

  it('does not connect the route across several nights', () => {
    const multi = assembleGuideDraft(CANDIDATES, plan, {
      slug: 'x',
      nights: 2,
      now: new Date('2026-09-26T00:00:00Z'),
    });
    expect(multi.connectRoute).toBe(false);
    expect(multi.routeEyebrow).toBe('2 NIGHTS · THREE PLACES');
  });

  it('turns capture links into editorial references', () => {
    const withLink = assembleGuideDraft(
      [{ ...CANDIDATES[0]!, links: ['https://www.example.com/beach', 'javascript:alert(1)'] }],
      buildFallbackPlan([CANDIDATES[0]!]),
      { slug: 'x', nights: 0, now: new Date('2026-09-26T00:00:00Z') },
    );
    expect(withLink.places[0]?.references).toEqual([
      expect.objectContaining({
        kind: 'editorial',
        url: 'https://www.example.com/beach',
        publisher: 'example.com',
      }),
    ]);
  });
});

describe('buildFallbackPlan', () => {
  it('orders by distance and uses neutral text', () => {
    const plan: GuidePlan = buildFallbackPlan(CANDIDATES);
    expect(plan.order.map(({ id }) => id)).toEqual(['p1', 'p3', 'p2']);
    expect(plan.title).toContain('세 곳');
    for (const step of plan.order) {
      expect(step.practicalNote).toContain('다시 확인');
    }
  });
});

describe('createGuideDraft', () => {
  const captures = [
    capture({ id: 1, places: [BEACH, TEMPLE] }),
    capture({ id: 2, places: [BAR, { name: '좌표 없음' }] }),
  ];
  const options = { nights: 0, slug: 'my-guide-x', now: new Date('2026-09-26T00:00:00Z') };

  it('uses the model plan when it passes validation', async () => {
    const prompts: string[] = [];
    const result = await createGuideDraft(captures, {
      ...options,
      callModel: async (prompt) => {
        prompts.push(prompt);
        return validResponse(['p3', 'p2', 'p1']);
      },
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.fallback).toBe(false);
    expect(result.guide.places.map(({ name }) => name)).toEqual([
      'Single Fin',
      'Uluwatu Temple',
      'Padang Padang Beach',
    ]);
    expect(result.unresolved).toEqual([{ name: '좌표 없음', captureId: 2 }]);
    expect(prompts).toHaveLength(1);
  });

  it('retries once, then falls back to distance order', async () => {
    let calls = 0;
    const result = await createGuideDraft(captures, {
      ...options,
      callModel: async () => {
        calls += 1;
        return 'not json';
      },
    });
    expect(calls).toBe(2);
    expect(result).toMatchObject({ status: 'ok', fallback: true });
  });

  it('falls back when the model call throws or is missing', async () => {
    await expect(
      createGuideDraft(captures, {
        ...options,
        callModel: async () => {
          throw new Error('network');
        },
      })
    ).resolves.toMatchObject({ status: 'ok', fallback: true });
    await expect(createGuideDraft(captures, { ...options, callModel: null })).resolves.toMatchObject({
      status: 'ok',
      fallback: true,
    });
  });

  it('needs at least two places with coordinates', async () => {
    await expect(
      createGuideDraft([capture({ places: [BEACH] })], { ...options, callModel: null })
    ).resolves.toEqual({ status: 'not-enough-places', unresolved: [] });
  });

  it('refuses too many places', async () => {
    const places = Array.from({ length: MAX_GUIDE_PLACES + 1 }, (_, i) => ({
      name: `장소 ${i}`,
      lat: 37 + i * 0.01,
      lng: 127,
    }));
    await expect(
      createGuideDraft([capture({ places })], { ...options, callModel: null })
    ).resolves.toEqual({ status: 'too-many-places' });
  });
});

describe('toGuideReferences', () => {
  const result: PlaceReviewResult = {
    naver: {
      status: 'ok',
      searchUrl: 'https://search.naver.com',
      posts: [
        {
          title: '빠당빠당 내돈내산',
          url: 'https://blog.naver.com/a/1',
          blogger: '여행자',
          date: '2026-05-01',
          excerpt: '계단이 가팔라요',
          score: 5,
          reasons: ['내돈내산'],
        },
      ],
    },
    youtube: {
      status: 'ok',
      searchUrl: 'https://youtube.com',
      dropped: [],
      videos: [
        {
          id: 'abc',
          title: 'Uluwatu 2026',
          channelTitle: 'Traveler',
          published: '2026-03-01',
          length: '12:00',
          viewCount: 5000,
          score: 4,
          url: 'https://www.youtube.com/watch?v=abc',
          thumbnailUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
          sceneCheck: 'checked',
        },
      ],
    },
  };

  it('maps blog posts to reviews and videos to video references', () => {
    const references = toGuideReferences(result, '2026-09-26');
    expect(references).toEqual([
      expect.objectContaining({
        kind: 'review',
        url: 'https://blog.naver.com/a/1',
        publisher: '여행자',
        checkedAt: '2026-09-26',
      }),
      expect.objectContaining({
        kind: 'video',
        url: 'https://www.youtube.com/watch?v=abc',
        publisher: 'Traveler',
        preview: expect.objectContaining({
          imageUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
        }),
      }),
    ]);
  });

  it('returns nothing for empty results', () => {
    expect(
      toGuideReferences(
        { ...result, naver: { ...result.naver, posts: [] }, youtube: { ...result.youtube, videos: [] } },
        '2026-09-26',
      )
    ).toEqual([]);
  });
});

describe('buildGuideSlug', () => {
  it('makes a lowercase slug with ten random characters', () => {
    const slug = buildGuideSlug(() => new Uint8Array(10).fill(25));
    expect(slug).toBe('my-guide-zzzzzzzzzz');
    expect(buildGuideSlug()).toMatch(/^my-guide-[a-z0-9]{10}$/);
    expect(buildGuideSlug()).not.toBe(buildGuideSlug());
  });
});
