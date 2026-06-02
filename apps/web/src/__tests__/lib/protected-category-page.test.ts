import { describe, expect, it } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import {
  getProtectedCategoryPageModel,
  removeCaptureFromCategoryPage,
} from '@/lib/protected-category-page';

function capture(id: number, title: string): CaptureItem {
  return {
    id,
    category: 'place',
    title,
    summary: '',
    places: [],
    extractedText: '',
    links: [],
    tags: [],
    source: 'other',
    imageUrl: '',
    createdAt: '2026-05-20T00:00:00.000Z',
    userId: null,
    confidence: 1,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  };
}

describe('getProtectedCategoryPageModel', () => {
  it('uses database captures even when the database is empty', () => {
    const model = getProtectedCategoryPageModel({
      dbCaptures: [],
      guestCaptures: [capture(-1, '게스트 캡처')],
      isAuthReady: true,
      isLoading: false,
    });

    expect(model.captures).toEqual([]);
  });

  it('does not expose guest captures on protected category pages', () => {
    const dbCapture = capture(1, 'DB 캡처');
    const model = getProtectedCategoryPageModel({
      dbCaptures: [dbCapture],
      guestCaptures: [capture(-1, '게스트 캡처')],
      isAuthReady: true,
      isLoading: false,
    });

    expect(model.captures).toEqual([dbCapture]);
  });

  it('keeps the page loading until auth state is ready', () => {
    const model = getProtectedCategoryPageModel({
      dbCaptures: [],
      guestCaptures: [],
      isAuthReady: false,
      isLoading: false,
    });

    expect(model.isLoading).toBe(true);
  });
});

describe('removeCaptureFromCategoryPage', () => {
  it('removes the deleted capture from the currently rendered category list', () => {
    const first = capture(1, '첫 번째');
    const second = capture(2, '두 번째');

    expect(removeCaptureFromCategoryPage([first, second], 1)).toEqual([second]);
  });
});
