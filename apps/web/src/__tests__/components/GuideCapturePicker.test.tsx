import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureItem } from '@scrave/shared';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { GuideCapturePicker } from '@/components/guides/GuideCapturePicker';
import { GUIDE_DRAFT_STORAGE_KEY } from '@/lib/guide-draft-edit';

function capture(id: number, title: string, places: CaptureItem['places'], category: CaptureItem['category'] = 'place'): CaptureItem {
  return {
    id,
    category,
    title,
    summary: '',
    places,
    extractedText: '',
    links: [],
    tags: [],
    source: 'instagram',
    imageUrl: `captures/u/${id}.jpg`,
    createdAt: '',
    userId: 'u',
    confidence: 1,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  };
}

const CAPTURES = [
  capture(1, '빠당빠당 해변', [{ name: 'Padang Padang', lat: -8.81, lng: 115.1 }]),
  capture(2, '절벽 바', [{ name: 'Single Fin', lat: -8.815, lng: 115.09 }, { name: 'El Kabron', lat: -8.82, lng: 115.08 }]),
  capture(3, '장소 없는 캡처', []),
];

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('GuideCapturePicker', () => {
  it('lists only captures with places and counts picked places', () => {
    render(<GuideCapturePicker captures={CAPTURES} onCancel={() => {}} />);

    expect(screen.queryByText('장소 없는 캡처')).toBeNull();
    const submit = screen.getByRole('button', { name: /초안 만들기/ });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('checkbox', { name: /빠당빠당 해변/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /절벽 바/ }));

    expect(screen.getByText('2장 · 장소 3곳')).toBeTruthy();
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  it('asks the server for a draft, keeps it for this tab and opens it', async () => {
    const guide = {
      slug: 'my-guide-abcdefghij',
      status: 'draft',
      title: '초안',
      places: [
        { id: 'p1', name: 'A', coordinates: { latitude: 1, longitude: 1 }, references: [] },
        { id: 'p2', name: 'B', coordinates: { latitude: 2, longitude: 2 }, references: [] },
      ],
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ guide, fallback: false, unresolved: [], coverImageUrl: 'captures/u/1.jpg' }), {
        status: 200,
      })
    );

    render(<GuideCapturePicker captures={CAPTURES} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /빠당빠당 해변/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /절벽 바/ }));
    fireEvent.change(screen.getByLabelText('일정'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /초안 만들기/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/guides/new'));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/guides/draft');
    expect(JSON.parse(String(init.body))).toEqual({ captureIds: [1, 2], nights: 2 });
    expect(JSON.parse(sessionStorage.getItem(GUIDE_DRAFT_STORAGE_KEY)!).coverImageUrl).toBe(
      'captures/u/1.jpg'
    );
  });

  it('shows why a draft could not be made', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'too-many-places' }), { status: 422 })
    );

    render(<GuideCapturePicker captures={CAPTURES} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /빠당빠당 해변/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /절벽 바/ }));
    fireEvent.click(screen.getByRole('button', { name: /초안 만들기/ }));

    expect((await screen.findByRole('alert')).textContent).toContain('12곳을 넘습니다');
    expect(push).not.toHaveBeenCalled();
  });
});
