import { describe, expect, it, vi } from 'vitest';
import { collectPlaceReviews } from '@/lib/place-review-sources';

const NOW = new Date('2026-09-26T00:00:00Z');
const FRAME_BYTES = new Uint8Array([0xff, 0xd8, 0xff]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function video(id: string, title: string, channelId = 'ch-good') {
  return {
    id,
    snippet: {
      title,
      channelId,
      channelTitle: channelId,
      description: '',
      publishedAt: '2026-05-01T00:00:00Z',
    },
    contentDetails: { duration: 'PT8M' },
    statistics: { viewCount: '5000' },
  };
}

interface FakeOptions {
  geminiText?: string;
  geminiStatus?: number;
  naverStatus?: number;
}

function fakeFetch({ geminiText, geminiStatus = 200, naverStatus = 200 }: FakeOptions = {}) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);

    if (url.startsWith('https://openapi.naver.com/v1/search/blog.json')) {
      if (naverStatus !== 200) return jsonResponse({ errorMessage: 'bad' }, naverStatus);
      return jsonResponse({
        items: [
          {
            title: '<b>아난타라</b> 울루와뚜 내돈내산',
            description: '남편이랑 1박 52만원',
            link: 'https://blog.naver.com/a/1',
            bloggername: 'a',
            postdate: '20260801',
          },
          {
            title: '아난타라 울루와뚜 체험단',
            description: '업체로부터 제공받아',
            link: 'https://blog.naver.com/b/2',
            bloggername: 'b',
            postdate: '20260801',
          },
        ],
      });
    }

    if (url.startsWith('https://www.googleapis.com/youtube/v3/search')) {
      return jsonResponse({
        items: ['v-scenery', 'v-faces', 'v-mass', 'v-other'].map((videoId) => ({ id: { videoId } })),
      });
    }

    if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) {
      return jsonResponse({
        items: [
          video('v-scenery', '아난타라 울루와뚜 룸투어'),
          video('v-faces', '아난타라 울루와뚜 브이로그'),
          video('v-mass', 'Anantara Uluwatu 아난타라 review', 'ch-mass'),
          video('v-other', 'Bali street food'),
        ],
      });
    }

    if (url.startsWith('https://www.googleapis.com/youtube/v3/channels')) {
      return jsonResponse({
        items: [
          { id: 'ch-good', statistics: { videoCount: '40', subscriberCount: '12000' } },
          { id: 'ch-mass', statistics: { videoCount: '2000', subscriberCount: '800' } },
        ],
      });
    }

    if (url.startsWith('https://i.ytimg.com/vi/')) {
      return new Response(FRAME_BYTES, { headers: { 'content-type': 'image/jpeg' } });
    }

    if (url.startsWith('https://generativelanguage.googleapis.com/')) {
      expect(init?.method).toBe('POST');
      if (geminiStatus !== 200) return jsonResponse({ error: 'down' }, geminiStatus);
      return jsonResponse({
        candidates: [{ content: { parts: [{ text: geminiText ?? '[]' }] } }],
      });
    }

    throw new Error(`Unexpected fetch ${url}`);
  });
}

const ALL_KEYS = {
  naverClientId: 'naver-id',
  naverClientSecret: 'naver-secret',
  youtubeApiKey: 'yt-key',
  geminiApiKey: 'gemini-key',
};

const SCENES = JSON.stringify([
  { id: 'v-scenery', people: [false, false, true], scenes: ['수영장', '객실', '사람'] },
  { id: 'v-faces', people: [true, true, false], scenes: ['얼굴', '얼굴', '해변'] },
]);

describe('collectPlaceReviews', () => {
  it('keeps unsponsored Naver posts through the official API', async () => {
    const fetchImpl = fakeFetch({ geminiText: SCENES });
    const result = await collectPlaceReviews('아난타라 울루와뚜', ALL_KEYS, { fetchImpl, now: NOW });

    expect(result.naver.status).toBe('ok');
    expect(result.naver.posts.map((post) => post.url)).toEqual(['https://blog.naver.com/a/1']);

    const naverCall = fetchImpl.mock.calls.find(([url]) => String(url).includes('openapi.naver.com'));
    expect(new URL(String(naverCall?.[0])).searchParams.get('query')).toBe('아난타라 울루와뚜 후기');
    expect(naverCall?.[1]?.headers).toMatchObject({
      'X-Naver-Client-Id': 'naver-id',
      'X-Naver-Client-Secret': 'naver-secret',
    });
  });

  it('drops AI-voice channels and face-heavy videos with reasons', async () => {
    const result = await collectPlaceReviews('아난타라 울루와뚜', ALL_KEYS, {
      fetchImpl: fakeFetch({ geminiText: SCENES }),
      now: NOW,
    });

    expect(result.youtube.status).toBe('ok');
    expect(result.youtube.videos.map((item) => item.id)).toEqual(['v-scenery']);
    expect(result.youtube.videos[0]).toMatchObject({
      sceneCheck: 'checked',
      scenes: ['수영장', '객실', '사람'],
    });
    expect(result.youtube.dropped).toEqual([
      expect.objectContaining({ id: 'v-mass', reasons: ['대량 생산 채널(영상 2,000개·구독 800명)'] }),
      expect.objectContaining({ id: 'v-faces', reasons: ['사람 얼굴 위주 장면'] }),
    ]);
  });

  it('keeps videos unchecked when the scene check fails', async () => {
    const result = await collectPlaceReviews('아난타라 울루와뚜', ALL_KEYS, {
      fetchImpl: fakeFetch({ geminiStatus: 503 }),
      now: NOW,
    });

    expect(result.youtube.videos.map((item) => item.id)).toEqual(['v-scenery', 'v-faces']);
    expect(result.youtube.videos.every((item) => item.sceneCheck === 'unchecked')).toBe(true);
  });

  it('returns search links only when keys are missing', async () => {
    const fetchImpl = fakeFetch();
    const result = await collectPlaceReviews('아난타라 울루와뚜', {}, { fetchImpl, now: NOW });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.naver).toMatchObject({ status: 'no-key', posts: [] });
    expect(result.youtube).toMatchObject({ status: 'no-key', videos: [], dropped: [] });
    expect(result.naver.searchUrl).toContain('search.naver.com');
    expect(result.youtube.searchUrl).toContain('youtube.com/results');
  });

  it('reports a failing source without hiding the other one', async () => {
    const result = await collectPlaceReviews('아난타라 울루와뚜', ALL_KEYS, {
      fetchImpl: fakeFetch({ naverStatus: 401, geminiText: SCENES }),
      now: NOW,
    });

    expect(result.naver).toMatchObject({ status: 'error', posts: [] });
    expect(result.youtube.status).toBe('ok');
  });
});
