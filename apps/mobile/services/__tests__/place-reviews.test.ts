import type { PlaceReviewResult } from '@scrave/shared';
import {
  clearPlaceReviewCache,
  describeReviewSource,
  fetchPlaceReviews,
  formatSceneLine,
} from '../place-reviews';

const RESULT: PlaceReviewResult = {
  naver: { status: 'ok', searchUrl: 'https://search.naver.com/x', posts: [] },
  youtube: { status: 'ok', searchUrl: 'https://www.youtube.com/results?x', videos: [], dropped: [] },
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => clearPlaceReviewCache());

describe('fetchPlaceReviews', () => {
  it('calls the web API with the session token', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(RESULT));

    await expect(
      fetchPlaceReviews('아난타라 울루와뚜', {
        serverUrl: 'https://scrave.vercel.app',
        getToken: async () => 'token-1',
        fetchImpl,
      })
    ).resolves.toEqual(RESULT);

    expect(fetchImpl).toHaveBeenCalledWith('https://scrave.vercel.app/api/place-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-1' },
      body: JSON.stringify({ name: '아난타라 울루와뚜' }),
    });
  });

  it('reuses the result for the same place', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(RESULT));
    const options = { serverUrl: 'https://s', getToken: async () => 't', fetchImpl };

    await fetchPlaceReviews('말리니', options);
    await fetchPlaceReviews('말리니', options);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('asks to log in when there is no session', async () => {
    const fetchImpl = jest.fn();

    await expect(
      fetchPlaceReviews('말리니', { serverUrl: 'https://s', getToken: async () => null, fetchImpl })
    ).rejects.toThrow('로그인한 뒤 후기와 영상을 볼 수 있습니다.');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('turns server errors into a short message', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ error: 'x' }, 500));

    await expect(
      fetchPlaceReviews('말리니', { serverUrl: 'https://s', getToken: async () => 't', fetchImpl })
    ).rejects.toThrow('후기와 영상을 불러오지 못했습니다.');
  });

  it('explains an expired session', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ error: 'x' }, 401));

    await expect(
      fetchPlaceReviews('말리니', { serverUrl: 'https://s', getToken: async () => 't', fetchImpl })
    ).rejects.toThrow('로그인한 뒤 후기와 영상을 볼 수 있습니다.');
  });
});

describe('describeReviewSource', () => {
  it('says why a source has nothing to show', () => {
    expect(describeReviewSource('naver', 'no-key', true)).toBe(
      '네이버 검색 API 키가 아직 없어 골라 드리지 못했습니다.'
    );
    expect(describeReviewSource('youtube', 'error', true)).toBe('유튜브 영상을 불러오지 못했습니다.');
    expect(describeReviewSource('youtube', 'ok', true)).toBe('기준을 통과한 영상이 없습니다.');
    expect(describeReviewSource('naver', 'ok', false)).toBeNull();
  });
});

describe('formatSceneLine', () => {
  it('shows what the scene check saw', () => {
    expect(formatSceneLine({ sceneCheck: 'checked', scenes: ['수영장', '객실', '해변'] })).toBe(
      '장면 수영장 · 객실 · 해변'
    );
    expect(formatSceneLine({ sceneCheck: 'unchecked' })).toBe('장면 확인 안 됨');
  });
});
