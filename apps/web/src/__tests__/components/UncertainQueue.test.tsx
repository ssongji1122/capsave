import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UncertainQueue } from '@/components/captures/UncertainQueue';
import type { CaptureItem } from '@scrave/shared';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  })),
  reclassifyCapture: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createClient: mocks.createClient,
}));

vi.mock('@scrave/shared', async () => {
  const actual = await vi.importActual<typeof import('@scrave/shared')>('@scrave/shared');
  return {
    ...actual,
    reclassifyCapture: mocks.reclassifyCapture,
  };
});

function capture(id = 10): CaptureItem {
  return {
    id,
    title: '낮은 신뢰도 캡처',
    category: 'text',
    summary: '분류 확인이 필요한 캡처',
    places: [{ name: '서울시청', address: '서울 중구' }],
    extractedText: '',
    links: [],
    tags: [],
    source: 'other',
    imageUrl: '',
    createdAt: '2026-05-20T00:00:00.000Z',
    userId: 'user-1',
    confidence: 0.3,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  };
}

afterEach(() => cleanup());

describe('UncertainQueue', () => {
  it('delegates reclassification to the parent state owner', async () => {
    const onReclassify = vi.fn().mockResolvedValue(undefined);

    render(React.createElement(UncertainQueue, {
      captures: [capture()],
      onDelete: vi.fn(),
      onReclassify,
    }));

    fireEvent.click(screen.getByRole('button', { name: '장소' }));

    await waitFor(() => {
      expect(onReclassify).toHaveBeenCalledWith(10, 'place', [
        { name: '서울시청', address: '서울 중구' },
      ]);
    });
    expect(mocks.reclassifyCapture).not.toHaveBeenCalled();
  });

  it('groups one Instagram post and reclassifies every preserved media row', async () => {
    const onReclassify = vi.fn().mockResolvedValue(undefined);
    const first = {
      ...capture(11),
      title: '서울 카페 여행 기록',
      imageUrl: 'owner/one.jpg',
      links: ['https://www.instagram.com/p/Abcd/'],
      places: [],
    };
    const second = {
      ...capture(12),
      title: '서울 카페 여행 기록',
      imageUrl: 'owner/two.jpg',
      links: ['https://www.instagram.com/p/Abcd/'],
      places: [],
    };

    render(React.createElement(UncertainQueue, {
      captures: [first, second],
      onDelete: vi.fn(),
      onReclassify,
    }));

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByAltText('서울 카페 여행 기록 · 올린 캡처 1/2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '장소' }));

    await waitFor(() => expect(onReclassify).toHaveBeenCalledTimes(2));
    expect(onReclassify).toHaveBeenNthCalledWith(1, 11, 'place', []);
    expect(onReclassify).toHaveBeenNthCalledWith(2, 12, 'place', []);
  });
});
