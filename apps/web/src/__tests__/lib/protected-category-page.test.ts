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
  it('uses guest captures when the database is empty', () => {
    const guestCapture = capture(-1, '게스트 캡처');
    const model = getProtectedCategoryPageModel({
      dbCaptures: [],
      guestCaptures: [guestCapture],
      isAuthReady: true,
      isLoading: false,
    });

    expect(model.captures).toEqual([guestCapture]);
  });

  it('merges guest captures with database captures for immediate use', () => {
    const dbCapture = capture(1, 'DB 캡처');
    const guestCapture = capture(-1, '게스트 캡처');
    const model = getProtectedCategoryPageModel({
      dbCaptures: [dbCapture],
      guestCaptures: [guestCapture],
      isAuthReady: true,
      isLoading: false,
    });

    expect(model.captures).toEqual([guestCapture, dbCapture]);
  });

  it('does not block guest captures while auth state is loading', () => {
    const guestCapture = capture(-1, '게스트 캡처');
    const model = getProtectedCategoryPageModel({
      dbCaptures: [],
      guestCaptures: [guestCapture],
      isAuthReady: false,
      isLoading: false,
    });

    expect(model.isLoading).toBe(false);
    expect(model.captures).toEqual([guestCapture]);
  });

  it('keeps the page loading when no guest captures exist and auth state is not ready', () => {
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
