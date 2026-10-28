import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import { CaptureCard } from '@/components/captures/CaptureCard';
import { getCaptureMeta } from '@/lib/capture-intent';

function makeCapture(overrides: Partial<CaptureItem> = {}): CaptureItem {
  return {
    id: 501,
    category: 'text',
    title: '공항 리무진 및 숙소 체크인 안내',
    summary: '예약번호 KX9482M · 문의 010-8765-4321',
    places: [],
    extractedText: '예약번호: KX9482M\n문의 전화: 010-8765-4321\n체크인 일시: 2026-11-03',
    links: ['https://example.com/booking'],
    tags: ['여행', '예약'],
    source: 'instagram',
    imageUrl: 'data:image/png;base64,aW1hZ2U=',
    createdAt: '2026-10-10T09:00:00.000Z',
    userId: 'user-1',
    confidence: 0.96,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: '@travel_note',
    ...overrides,
  };
}

describe('CaptureCard post-capture actions, original zoom, and intent saving', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows extracted reservation code, phone number, and date actions when expanded and toggles completion', () => {
    const item = makeCapture();
    render(React.createElement(CaptureCard, { item, onDelete: vi.fn() }));

    // Expand card by clicking title
    fireEvent.click(screen.getByText('공항 리무진 및 숙소 체크인 안내'));

    expect(screen.getByText(/예약·확인번호 · KX9482M/)).toBeTruthy();
    expect(screen.getByText(/전화 · 010-8765-4321/)).toBeTruthy();
    expect(screen.getByText(/일정 · 2026-11-03/)).toBeTruthy();

    // Toggle completion of reservation_code action
    const completeBtn = screen.getByRole('button', {
      name: '예약·확인번호 · KX9482M 처리 완료 표시',
    });
    fireEvent.click(completeBtn);

    const savedMeta = getCaptureMeta(window.localStorage, 501);
    expect(savedMeta.completedActions).toContain('reservation_code:KX9482M');
  });

  it('allows selecting capture reasons, revisit timing, and travel pack pinning', () => {
    const item = makeCapture({ id: 502, title: '발리 우붓 레퍼런스' });
    const onMetaChange = vi.fn();
    render(
      React.createElement(CaptureCard, {
        item,
        onDelete: vi.fn(),
        onMetaChange,
      }),
    );

    fireEvent.click(screen.getByText('발리 우붓 레퍼런스'));

    const reasonBtn = screen.getByRole('button', { name: '작업·디자인 참고' });
    fireEvent.click(reasonBtn);

    const travelPinBtn = screen.getByRole('button', { name: /여행·예약 묶음 고정/ });
    fireEvent.click(travelPinBtn);

    const savedMeta = getCaptureMeta(window.localStorage, 502);
    expect(savedMeta.reasons).toContain('reference');
    expect(savedMeta.pinnedToTravelPack).toBe(true);
    expect(onMetaChange).toHaveBeenCalled();
  });

  it('opens and closes the uncropped original image zoom modal', () => {
    const item = makeCapture({ id: 503, title: '비자 원본 확인서' });
    render(React.createElement(CaptureCard, { item, onDelete: vi.fn() }));

    const zoomBtn = screen.getByRole('button', { name: '비자 원본 확인서 원본 확대' });
    fireEvent.click(zoomBtn);

    expect(screen.getByRole('dialog', { name: '비자 원본 확인서 원본 이미지' })).toBeTruthy();

    const closeBtn = screen.getByRole('button', { name: '원본 확대 닫기' });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog', { name: '비자 원본 확인서 원본 이미지' })).toBeNull();
  });
});
