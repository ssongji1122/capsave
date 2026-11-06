import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import HomePage from '@/app/(app)/dashboard/page';

const mocks = vi.hoisted(() => ({
  useCaptures: vi.fn(),
  useGuestCaptures: vi.fn(),
}));

vi.mock('@/contexts/CapturesContext', () => ({
  MAX_FREE_CAPTURES: 10,
  useCaptures: mocks.useCaptures,
}));

vi.mock('@/contexts/GuestCapturesContext', () => ({
  useGuestCaptures: mocks.useGuestCaptures,
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
    mocks.useGuestCaptures.mockReturnValue({
      guestCaptures: [],
      remainingSlots: 3,
      isGuestFull: false,
      addCapture: vi.fn(),
      deleteCapture: vi.fn(),
      reclassifyCapture: vi.fn(),
      clearCaptures: vi.fn(),
    });
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
    await screen.findByRole('heading', { name: '삭제할 검색 결과' });

    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제할 검색 결과 삭제' }));

    await waitFor(() => expect(deleteCapture).toHaveBeenCalledWith(1));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '삭제할 검색 결과' })).toBeNull();
    });
  });

  it('shows a login entry instead of samples in an empty archive', () => {
    mocks.useCaptures.mockReturnValue({
      captures: [],
      isLoading: false,
      hasMore: false,
      isLoadingMore: false,
      loadMore: vi.fn(),
      deleteCapture: vi.fn(),
      searchCaptures: vi.fn(),
      reclassifyCapture: vi.fn(),
      saveCapture: vi.fn(),
      isFreeLimitReached: false,
      freeRemaining: 10,
      isAuthenticated: false,
      isAuthReady: true,
    });

    render(React.createElement(HomePage));

    expect(screen.queryByText('성수 브런치 저장 샘플')).toBeNull();
    expect(screen.getByRole('link', {name:'로그인해서 내 캡처 불러오기'})).toBeTruthy();
  });

  it('never injects samples into empty archive search', async () => {
    mocks.useCaptures.mockReturnValue({
      captures: [],
      isLoading: false,
      hasMore: false,
      isLoadingMore: false,
      loadMore: vi.fn(),
      deleteCapture: vi.fn(),
      searchCaptures: vi.fn(),
      reclassifyCapture: vi.fn(),
      saveCapture: vi.fn(),
      isFreeLimitReached: false,
      freeRemaining: 10,
      isAuthenticated: false,
      isAuthReady: true,
    });

    render(React.createElement(HomePage));

    fireEvent.change(screen.getByRole('searchbox', { name: '캡처 검색' }), {
      target: { value: '우도' },
    });

    expect(screen.queryByText('여행 준비 메모 샘플')).toBeNull();
    await waitFor(() => {
      expect(screen.queryByText('성수 브런치 저장 샘플')).toBeNull();
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
    await screen.findByRole('heading', { name: '삭제 실패 검색 결과' });

    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제 실패 검색 결과 삭제' }));

    await waitFor(() => expect(deleteCapture).toHaveBeenCalledWith(3));
    expect(screen.getByRole('heading', { name: '삭제 실패 검색 결과' })).toBeTruthy();
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
    expect(screen.getByLabelText('검색 근거').textContent).toContain('제목에서 찾음: 재분류할 검색 결과');

    fireEvent.click(screen.getByRole('button', { name: '장소' }));

    await waitFor(() => {
      expect(reclassifyCapture).toHaveBeenCalledWith(2, 'place', []);
    });
    await waitFor(() => {
      expect(screen.queryByText('확인 필요')).toBeNull();
    });
    expect(screen.getByRole('link', { name: '지도 보기' })).toBeTruthy();
  });

  it('finds guest captures with the same dashboard search box', async () => {
    const guestCapture = capture(-1, '게스트 성수 카페', {
      category: 'place',
      places: [{ name: '오브젝트 성수', address: '서울 성동구 연무장길' }],
      userId: null,
    });
    const searchCaptures = vi.fn().mockResolvedValue([]);

    mocks.useCaptures.mockReturnValue({
      captures: [],
      isLoading: false,
      hasMore: false,
      isLoadingMore: false,
      loadMore: vi.fn(),
      deleteCapture: vi.fn(),
      searchCaptures,
      reclassifyCapture: vi.fn(),
      saveCapture: vi.fn(),
      isFreeLimitReached: false,
      freeRemaining: 10,
      isAuthenticated: false,
      isAuthReady: true,
    });
    mocks.useGuestCaptures.mockReturnValue({
      guestCaptures: [guestCapture],
      remainingSlots: 2,
      isGuestFull: false,
      addCapture: vi.fn(),
      deleteCapture: vi.fn(),
      reclassifyCapture: vi.fn(),
      clearCaptures: vi.fn(),
    });

    render(React.createElement(HomePage));

    fireEvent.change(screen.getByRole('searchbox', { name: '캡처 검색' }), {
      target: { value: '연무장길' },
    });

    await screen.findByText('게스트 성수 카페');
    expect(searchCaptures).not.toHaveBeenCalled();
    expect((await screen.findByLabelText('검색 근거')).textContent).toContain('장소 주소에서 찾음: 서울 성동구 연무장길');
    fireEvent.click(screen.getByRole('button', { name: '한 장씩' }));
    expect(screen.getByLabelText('검색 근거').textContent).toContain('연무장길');
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
    await waitFor(() => expect(screen.queryByLabelText('검색 근거')).toBeNull());
  });

  it('does not attach a newer query to stale asynchronous results after clearing', async () => {
    let resolveSearch!: (items: CaptureItem[]) => void;
    const searchCaptures = vi.fn(() => new Promise<CaptureItem[]>(resolve => { resolveSearch = resolve; }));
    mocks.useCaptures.mockReturnValue({
      captures: [], isLoading: false, hasMore: false, isLoadingMore: false,
      loadMore: vi.fn(), deleteCapture: vi.fn(), searchCaptures, reclassifyCapture: vi.fn(),
      saveCapture: vi.fn(), isFreeLimitReached: false, freeRemaining: 10,
      isAuthenticated: true, isAuthReady: true,
    });
    render(React.createElement(HomePage));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '파스타' } });
    await waitFor(() => expect(searchCaptures).toHaveBeenCalledWith('파스타'));
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
    await new Promise(resolve => setTimeout(resolve, 350));
    resolveSearch([capture(99, '늦은 응답 카드', { extractedText: '파스타' })]);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.queryByText('늦은 응답 카드')).toBeNull();
  });

});
