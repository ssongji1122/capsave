import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicGuide } from '@scrave/shared';

vi.mock('@/components/guides/PublicGuideExperience', () => ({
  PublicGuideExperience: ({ guide, mode, saveImageUrl }: { guide: PublicGuide; mode: string; saveImageUrl?: string }) => (
    <ol data-testid="preview" data-mode={mode} data-image={saveImageUrl}>
      {guide.places.map((place) => (
        <li key={place.id}>{`${place.sequence}. ${place.name} (${place.references.length})`}</li>
      ))}
    </ol>
  ),
}));

import { GuideDraftScreen } from '@/components/guides/GuideDraftScreen';
import {
  GUIDE_DRAFT_STORAGE_KEY,
  parseStoredGuideDraft,
  serializeGuideDraft,
} from '@/lib/guide-draft-edit';
import { ULUWATU_GUIDE } from '@/lib/public-guides';

const DRAFT = {
  guide: {
    ...ULUWATU_GUIDE,
    slug: 'my-guide-abcdefghij',
    status: 'draft' as const,
    places: ULUWATU_GUIDE.places.map((place) => ({ ...place, references: [] })),
  },
  coverImageUrl: 'captures/u/1.jpg',
  fallback: true,
  unresolved: [{ name: '좌표 없는 카페', captureId: 4 }],
};

const fetchMock = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function previewNames() {
  return within(screen.getByTestId('preview'))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('GuideDraftScreen', () => {
  it('points back to places when there is no draft', async () => {
    render(<GuideDraftScreen />);
    const link = await screen.findByRole('link', { name: /장소에서 캡처 고르기/ });
    expect(link.getAttribute('href')).toBe('/places');
  });

  it('shows the draft with its notices and the cover image for saving', async () => {
    sessionStorage.setItem(GUIDE_DRAFT_STORAGE_KEY, serializeGuideDraft(DRAFT));
    render(<GuideDraftScreen />);

    expect(await screen.findByText(/AI 초안 · 방문 전 확인 필요/)).toBeTruthy();
    expect(screen.getByText(/거리순으로 놓았습니다/)).toBeTruthy();
    expect(screen.getByText(/좌표 없는 카페/)).toBeTruthy();
    expect(screen.getByTestId('preview').getAttribute('data-mode')).toBe('draft');
    expect(screen.getByTestId('preview').getAttribute('data-image')).toBe('captures/u/1.jpg');
  });

  it('moves a place down and keeps the change for this tab', async () => {
    sessionStorage.setItem(GUIDE_DRAFT_STORAGE_KEY, serializeGuideDraft(DRAFT));
    render(<GuideDraftScreen />);

    const first = DRAFT.guide.places[0]!.name;
    fireEvent.click(await screen.findByRole('button', { name: `${first} 아래로` }));

    expect(previewNames()[1]).toBe(`2. ${first} (0)`);
    const stored = parseStoredGuideDraft(sessionStorage.getItem(GUIDE_DRAFT_STORAGE_KEY));
    expect(stored?.guide.places[1]?.name).toBe(first);
  });

  it('edits the visit window when the field loses focus', async () => {
    sessionStorage.setItem(GUIDE_DRAFT_STORAGE_KEY, serializeGuideDraft(DRAFT));
    render(<GuideDraftScreen />);

    const name = DRAFT.guide.places[0]!.name;
    const input = await screen.findByLabelText(`${name} 방문 시간`);
    fireEvent.change(input, { target: { value: '해 뜬 직후' } });
    fireEvent.blur(input);

    const stored = parseStoredGuideDraft(sessionStorage.getItem(GUIDE_DRAFT_STORAGE_KEY));
    expect(stored?.guide.places[0]?.visitWindow).toBe('해 뜬 직후');
  });

  it('attaches picked reviews and videos to a place', async () => {
    sessionStorage.setItem(GUIDE_DRAFT_STORAGE_KEY, serializeGuideDraft(DRAFT));
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          naver: {
            status: 'ok',
            searchUrl: 'https://search.naver.com',
            posts: [
              { title: '후기', url: 'https://blog.naver.com/a/1', blogger: 'a', date: null, excerpt: '', score: 1, reasons: [] },
            ],
          },
          youtube: { status: 'no-key', searchUrl: 'https://youtube.com', videos: [], dropped: [] },
        }),
        { status: 200 },
      )
    );
    render(<GuideDraftScreen />);

    const name = DRAFT.guide.places[0]!.name;
    fireEvent.click(await screen.findByRole('button', { name: `${name} 후기·영상 붙이기` }));

    await waitFor(() => expect(previewNames()[0]).toBe(`1. ${name} (1)`));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/place-reviews');
    expect(JSON.parse(String(init.body))).toEqual({ name });
    expect(screen.getByText('1개 붙임')).toBeTruthy();
  });
});
