import { describe, expect, it } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import {
  filterCapturesByArchiveQuery,
  mergeArchiveCaptures,
} from '@/lib/archive-search';

function capture(
  id: number,
  title: string,
  overrides: Partial<CaptureItem> = {},
): CaptureItem {
  return {
    id,
    category: 'text',
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
    ...overrides,
  };
}

describe('mergeArchiveCaptures', () => {
  it('shows guest captures first, then database captures by creation date', () => {
    const olderDb = capture(1, 'DB 오래된 캡처', {
      createdAt: '2026-05-20T00:00:00.000Z',
      userId: 'user-1',
    });
    const newerGuest = capture(-1, '게스트 새 캡처', {
      createdAt: '2026-05-22T00:00:00.000Z',
    });
    const newerDb = capture(2, 'DB 새 캡처', {
      createdAt: '2026-05-21T00:00:00.000Z',
      userId: 'user-1',
    });

    expect(mergeArchiveCaptures([olderDb, newerDb], [newerGuest])).toEqual([
      newerGuest,
      newerDb,
      olderDb,
    ]);
  });
});

describe('filterCapturesByArchiveQuery', () => {
  it('matches query terms across title, summary, extracted text, tags, and places', () => {
    const captures = [
      capture(1, '성수 저장 카페', {
        category: 'place',
        places: [{ name: '오브젝트 성수', address: '서울 성동구 연무장길' }],
        tags: ['카페'],
      }),
      capture(2, '레시피 메모', {
        summary: '저녁에 다시 볼 글',
        extractedText: '토마토 파스타 소스 비율',
        tags: ['요리'],
      }),
      capture(3, '다른 캡처', {
        summary: '검색 대상 아님',
      }),
    ];

    expect(filterCapturesByArchiveQuery(captures, '연무장길').map((item) => item.id)).toEqual([1]);
    expect(filterCapturesByArchiveQuery(captures, '파스타').map((item) => item.id)).toEqual([2]);
    expect(filterCapturesByArchiveQuery(captures, '요리').map((item) => item.id)).toEqual([2]);
  });

  it('requires every query term to match somewhere in the same capture', () => {
    const captures = [
      capture(1, '성수 카페', {
        places: [{ name: '오브젝트 성수', address: '서울 성동구' }],
      }),
      capture(2, '성수 전시', {
        summary: '주말에 볼 전시',
      }),
    ];

    expect(filterCapturesByArchiveQuery(captures, '성수 카페').map((item) => item.id)).toEqual([1]);
  });
});
