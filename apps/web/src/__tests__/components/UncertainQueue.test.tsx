import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { UncertainQueue } from '@/components/captures/UncertainQueue';
import type { CaptureItem } from '@scrave/shared';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({})),
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

function capture(): CaptureItem {
  return {
    id: 10,
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
});
