import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SocialLinkImport } from '@/components/import/SocialLinkImport';

const captures = [
  {
    imageUrl: 'https://scontent.cdninstagram.com/one.jpg',
    imageKind: 'image',
    selected: false,
    analysis: {
      category: 'place',
      title: '서울 카페',
      summary: '창가가 좋은 카페',
      extractedText: '서울 카페\n창가가 좋은 카페',
      tags: ['수집됨', '검증 전', '여행·장소'],
      links: ['https://www.instagram.com/p/Abcd/'],
      places: [],
      source: 'instagram',
      confidence: 0,
      sourceAccountId: 'seoulpick',
      sourceIndices: [0],
    },
  },
  {
    imageUrl: 'https://scontent.cdninstagram.com/two.jpg',
    imageKind: 'video-preview',
    selected: true,
    analysis: {
      category: 'place',
      title: '서울 카페',
      summary: '창가가 좋은 카페',
      extractedText: '서울 카페\n창가가 좋은 카페',
      tags: ['수집됨', '검증 전', '여행·장소'],
      links: ['https://www.instagram.com/p/Abcd/'],
      places: [],
      source: 'instagram',
      confidence: 0,
      sourceAccountId: 'seoulpick',
      sourceIndices: [1],
    },
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

it('shows the exact supported scope to signed-out users', () => {
  render(
    <SocialLinkImport
      isAuthenticated={false}
      isAuthReady
      freeRemaining={10}
      persist={vi.fn()}
      refresh={vi.fn()}
    />
  );
  expect(screen.getByText('현재 공개 게시물과 릴스를 지원합니다. 비공개·삭제된 게시물은 불러올 수 없습니다.')).toBeTruthy();
  expect(screen.getByRole('link', { name: '로그인하고 저장하기' })).toBeTruthy();
  expect((screen.getByRole('button', { name: '링크 확인' }) as HTMLButtonElement).disabled).toBe(true);
});

it('shows ordered media, selected image, attribution, and unverified status', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          post: {
            url: 'https://www.instagram.com/p/Abcd/',
            author: 'seoulpick',
            caption: '서울 카페\n창가가 좋은 카페',
            selectedIndex: 2,
            images: captures.map(({ imageUrl, imageKind }) => ({ url: imageUrl, kind: imageKind })),
          },
          captures,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
  );

  render(
    <SocialLinkImport
      isAuthenticated
      isAuthReady
      freeRemaining={10}
      persist={vi.fn()}
      refresh={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText('Instagram 게시물 링크'), {
    target: { value: 'https://instagram.com/p/Abcd/?img_index=2' },
  });
  fireEvent.click(screen.getByRole('button', { name: '링크 확인' }));

  expect(await screen.findByText('@seoulpick')).toBeTruthy();
  expect(screen.getByText('수집됨 · 확인 전')).toBeTruthy();
  expect(screen.getByText('첫 분류 · 여행·장소')).toBeTruthy();
  expect(screen.getByText('1 / 2')).toBeTruthy();
  expect(screen.getByText('2 / 2 · 선택한 이미지')).toBeTruthy();
  expect(screen.getByText('영상 미리보기')).toBeTruthy();
  expect(screen.getByRole('button', { name: '원본 2장 계정에 저장' })).toBeTruthy();
});

it('saves in reverse insertion order so a newest-first query restores media order', async () => {
  const downloaded: string[] = [];
  const persist = vi.fn(async () => undefined);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === 'POST' && url === '/api/social-link') {
      return new Response(JSON.stringify({
        post: { url: captures[0].analysis.links[0], author: 'seoulpick', caption: '서울 카페', selectedIndex: 1, images: [] },
        captures,
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.startsWith('/api/social-link?src=')) {
      downloaded.push(new URL(url, 'http://localhost').searchParams.get('src')!);
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/jpeg' } });
    }
    if (url === '/api/upload' && init?.method === 'POST') {
      return new Response(JSON.stringify({ path: `owner/${downloaded.length}.jpg` }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`unexpected request ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);

  render(
    <SocialLinkImport
      isAuthenticated
      isAuthReady
      freeRemaining={10}
      persist={persist}
      refresh={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText('Instagram 게시물 링크'), { target: { value: 'https://instagram.com/p/Abcd/' } });
  fireEvent.click(screen.getByRole('button', { name: '링크 확인' }));
  fireEvent.click(await screen.findByRole('button', { name: '원본 2장 계정에 저장' }));

  expect(await screen.findByText('원본 2장과 본문·작성자·출처 링크를 보관함에 저장했습니다. 아직 확인 전 자료입니다.')).toBeTruthy();
  expect(downloaded).toEqual([captures[1].imageUrl, captures[0].imageUrl]);
  expect(persist).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('link', { name: '보관함에서 보기' })).toBeTruthy();
  await waitFor(() => expect((screen.getByRole('button', { name: '저장 완료' }) as HTMLButtonElement).disabled).toBe(true));
});
