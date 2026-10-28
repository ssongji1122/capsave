import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlaceReviews, clearPlaceReviewCache } from '@/components/captures/PlaceReviews';

const RESULT = {
  naver: {
    status: 'ok',
    searchUrl: 'https://search.naver.com/search.naver?query=x',
    posts: [
      {
        title: '아난타라 울루와뚜 내돈내산 후기',
        url: 'https://blog.naver.com/a/1',
        blogger: 'a',
        date: '2026-08-01',
        excerpt: '남편이랑 1박 52만원',
        score: 9,
        reasons: ['2026년 8월 작성', '내돈내산', '가격'],
      },
    ],
  },
  youtube: {
    status: 'ok',
    searchUrl: 'https://www.youtube.com/results?search_query=x',
    videos: [
      {
        id: 'v-scenery',
        title: '아난타라 룸투어',
        channelTitle: '여행자',
        published: '2026-05-01',
        length: '8:00',
        viewCount: 5000,
        score: 6,
        url: 'https://www.youtube.com/watch?v=v-scenery',
        thumbnailUrl: 'https://i.ytimg.com/vi/v-scenery/hqdefault.jpg',
        sceneCheck: 'checked',
        scenes: ['수영장', '객실', '사람'],
      },
    ],
    dropped: [
      {
        id: 'v-faces',
        title: '브이로그',
        channelTitle: 'c',
        url: 'https://www.youtube.com/watch?v=v-faces',
        reasons: ['사람 얼굴 위주 장면'],
      },
    ],
  },
};

afterEach(() => {
  cleanup();
  clearPlaceReviewCache();
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('PlaceReviews', () => {
  it('loads picked reviews and videos on demand', async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify(RESULT)));
    render(<PlaceReviews placeName="아난타라 울루와뚜" />);

    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /골라 둔 후기·영상/ }));

    expect(await screen.findByRole('link', { name: /아난타라 울루와뚜 내돈내산 후기/ })).toHaveProperty(
      'href',
      'https://blog.naver.com/a/1'
    );
    expect(screen.getByText('내돈내산')).toBeTruthy();
    expect(screen.getByRole('link', { name: /아난타라 룸투어/ })).toBeTruthy();
    expect(screen.getByText(/수영장 · 객실 · 사람/)).toBeTruthy();
    expect(screen.getByText(/뺀 영상 1개/)).toBeTruthy();
    expect(screen.getByText(/사람 얼굴 위주 장면/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/place-reviews', expect.objectContaining({ method: 'POST' }));
  });

  it('explains missing API keys and keeps the search link', async () => {
    stubFetch(
      new Response(
        JSON.stringify({
          naver: { ...RESULT.naver, status: 'no-key', posts: [] },
          youtube: { ...RESULT.youtube, status: 'no-key', videos: [], dropped: [] },
        })
      )
    );
    render(<PlaceReviews placeName="아난타라 울루와뚜" />);
    fireEvent.click(screen.getByRole('button', { name: /골라 둔 후기·영상/ }));

    expect(await screen.findByText(/네이버 검색 API 키가 아직 없어/)).toBeTruthy();
    expect(screen.getByText(/YouTube API 키가 아직 없어/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /네이버에서 직접 보기/ })).toHaveProperty(
      'href',
      RESULT.naver.searchUrl
    );
  });

  it('shows a retry when the request fails', async () => {
    stubFetch(new Response(JSON.stringify({ error: 'x' }), { status: 500 }));
    render(<PlaceReviews placeName="아난타라 울루와뚜" />);
    fireEvent.click(screen.getByRole('button', { name: /골라 둔 후기·영상/ }));

    expect(await screen.findByRole('button', { name: /다시 불러오기/ })).toBeTruthy();
  });
});

it('uses the capture need as the review query and explains it',async()=>{
 const fetchMock=stubFetch(new Response(JSON.stringify(RESULT)));
 render(<PlaceReviews placeName="세부 막탄 공항" topic={{query:'세부 막탄 공항 심야 도착 공항 이동',label:'도착 후 이동 후기',reason:'심야 도착 일정입니다.'}} />);
 expect(screen.getByText('심야 도착 일정입니다.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/도착 후 이동 후기/}));
 await screen.findByText('아난타라 울루와뚜 내돈내산 후기');
 expect(JSON.parse(fetchMock.mock.calls[0][1].body).name).toContain('심야 도착');
});

it('explains that picked reviews require login',async()=>{
 stubFetch(new Response('{}',{status:401}));
 render(<PlaceReviews placeName="세부 공항" />);
 fireEvent.click(screen.getByRole('button',{name:/골라 둔 후기/}));
 expect(await screen.findByRole('link',{name:'로그인하고 후기 보기'})).toBeTruthy();
});
