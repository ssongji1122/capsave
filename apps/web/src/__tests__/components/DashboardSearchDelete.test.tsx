import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import HomePage from '@/app/(app)/dashboard/page';

const mocks = vi.hoisted(() => ({
  useCaptures: vi.fn(),
}));

vi.mock('@/contexts/CapturesContext', () => ({
  MAX_FREE_CAPTURES: 10,
  useCaptures: mocks.useCaptures,
}));

function capture(
  id: number,
  title: string,
  overrides: Partial<CaptureItem> = {},
): CaptureItem {
  return {
    id,
    title,
    category: 'text',
    summary: '검색 결과 요약',
    places: [],
    extractedText: '',
    links: [],
    tags: [],
    source: 'other',
    imageUrl: 'data:image/png;base64,aW1hZ2U=',
    createdAt: '2026-05-20T00:00:00.000Z',
    userId: 'user-1',
    confidence: 0.9,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
    ...overrides,
  };
}

describe('dashboard search results', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('removes a deleted capture from the active search results immediately', async () => {
    const searchedCapture = capture(1, '삭제할 검색 결과');
    const deleteCapture = vi.fn().mockResolvedValue(true);
    const searchCaptures = vi.fn().mockResolvedValue([searchedCapture]);

    mocks.useCaptures.mockReturnValue({
      captures: [],
      isLoading: false,
      hasMore: false,
      isLoadingMore: false,
      loadMore: vi.fn(),
      deleteCapture,
      searchCaptures,
      reclassifyCapture: vi.fn(),
      saveCapture: vi.fn(),
      isFreeLimitReached: false,
      freeRemaining: 10,
      isAuthenticated: true,
      isAuthReady: true,
    });

    render(React.createElement(HomePage));

    fireEvent.change(screen.getByRole('searchbox', { name: '캡처 검색' }), {
      target: { value: '삭제' },
    });

    await waitFor(() => expect(searchCaptures).toHaveBeenCalledWith('삭제'));
    await screen.findByText('삭제할 검색 결과');

    fireEvent.click(screen.getByRole('button', { name: '삭제할 검색 결과 삭제' }));

    await waitFor(() => expect(deleteCapture).toHaveBeenCalledWith(1));
    await waitFor(() => {
      expect(screen.queryByText('삭제할 검색 결과')).toBeNull();
    });
  });

  it('keeps a search result visible when deletion fails', async () => {
    const searchedCapture = capture(3, '삭제 실패 검색 결과');
    const deleteCapture = vi.fn().mockResolvedValue(false);
    const searchCaptures = vi.fn().mockResolvedValue([searchedCapture]);

    mocks.useCaptures.mockReturnValue({
      captures: [],
      isLoading: false,
      hasMore: false,
      isLoadingMore: false,
      loadMore: vi.fn(),
      deleteCapture,
      searchCaptures,
      reclassifyCapture: vi.fn(),
      saveCapture: vi.fn(),
      isFreeLimitReached: false,
      freeRemaining: 10,
      isAuthenticated: true,
      isAuthReady: true,
    });

    render(React.createElement(HomePage));

    fireEvent.change(screen.getByRole('searchbox', { name: '캡처 검색' }), {
      target: { value: '삭제 실패' },
    });

    await waitFor(() => expect(searchCaptures).toHaveBeenCalledWith('삭제 실패'));
    await screen.findByText('삭제 실패 검색 결과');

    fireEvent.click(screen.getByRole('button', { name: '삭제 실패 검색 결과 삭제' }));

    await waitFor(() => expect(deleteCapture).toHaveBeenCalledWith(3));
    expect(screen.getByText('삭제 실패 검색 결과')).toBeTruthy();
  });

  it('moves a reclassified search result out of the uncertain queue immediately', async () => {
    const uncertainCapture = capture(2, '재분류할 검색 결과', { confidence: 0.3 });
    const reclassifiedCapture = capture(2, '재분류할 검색 결과', {
      category: 'place',
      confidence: 1,
      places: [{ name: '서울시청', address: '서울 중구' }],
      reclassifiedAt: '2026-05-20T00:10:00.000Z',
    });
    const reclassifyCapture = vi.fn().mockResolvedValue(reclassifiedCapture);
    const searchCaptures = vi.fn().mockResolvedValue([uncertainCapture]);

    mocks.useCaptures.mockReturnValue({
      captures: [],
      isLoading: false,
      hasMore: false,
      isLoadingMore: false,
      loadMore: vi.fn(),
      deleteCapture: vi.fn(),
      searchCaptures,
      reclassifyCapture,
      saveCapture: vi.fn(),
      isFreeLimitReached: false,
      freeRemaining: 10,
      isAuthenticated: true,
      isAuthReady: true,
    });

    render(React.createElement(HomePage));

    fireEvent.change(screen.getByRole('searchbox', { name: '캡처 검색' }), {
      target: { value: '재분류' },
    });

    await waitFor(() => expect(searchCaptures).toHaveBeenCalledWith('재분류'));
    await screen.findByText('확인 필요');

    fireEvent.click(screen.getByRole('button', { name: '장소' }));

    await waitFor(() => {
      expect(reclassifyCapture).toHaveBeenCalledWith(2, 'place', []);
    });
    await waitFor(() => {
      expect(screen.queryByText('확인 필요')).toBeNull();
    });
    expect(screen.getAllByText('장소 1개').length).toBeGreaterThan(0);
  });
});
