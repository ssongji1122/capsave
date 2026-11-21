import { describe, expect, it } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import {
  filterCapturesByArchiveQuery,
  mergeArchiveCaptures,
  getCaptureSearchEvidence,
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


describe('getCaptureSearchEvidence', () => {
  it('explains a match found only in extracted text without inventing original text', () => {
    const item = capture(1, '저녁 메모', { extractedText: '토마토 파스타 소스 비율' });
    expect(getCaptureSearchEvidence(item, '파스타')).toEqual([
      { label: '사진에서 읽은 글', excerpt: '토마토 파스타 소스 비율' },
    ]);
  });

  it('covers terms in separate fields, preserving existing AND search', () => {
    const item = capture(1, '저녁 메모', {
      extractedText: '토마토 파스타', places: [{ name: '식당', address: '서울 성수' }],
    });
    expect(getCaptureSearchEvidence(item, '성수 파스타').map(row => row.label))
      .toEqual(['장소 주소', '사진에서 읽은 글']);
    expect(filterCapturesByArchiveQuery([item], '성수 없는말')).toEqual([]);
  });

  it('uses literal matching and keeps source case', () => {
    const item = capture(1, 'C++ [메모]');
    expect(getCaptureSearchEvidence(item, 'c++ [메모]')).toEqual([
      { label: '제목', excerpt: 'C++ [메모]' },
    ]);
    expect(getCaptureSearchEvidence(item, '   ')).toEqual([]);
    expect(getCaptureSearchEvidence(item, '없는말')).toEqual([]);
  });

  it('shows a match near the end of long text, and later terms in that same field', () => {
    const item = capture(1, '메모', { extractedText: '시작 ' + '가'.repeat(200) + ' 연무장길' });
    const rows = getCaptureSearchEvidence(item, '시작 연무장길');
    expect(rows.some(row => row.excerpt.includes('시작'))).toBe(true);
    expect(rows.some(row => row.excerpt.includes('연무장길'))).toBe(true);
    expect(rows.every(row => row.excerpt.length < 100)).toBe(true);
  });

  it('labels generated related terms separately', () => {
    expect(getCaptureSearchEvidence(capture(1, '메모', { relatedSearchTerms: ['레시피'] }), '레시피'))
      .toEqual([{ label: '연관 검색어', excerpt: '레시피' }]);
  });

  it('keeps evidence from a grouped post member whose title was not retained', () => {
    const links = ['https://www.instagram.com/p/Example/'];
    const first = capture(1, '첫 장', { links });
    const second = capture(2, '둘째 장 파스타', { links });
    const unrelated = capture(3, '다른 게시물 파스타');
    expect(getCaptureSearchEvidence(first, '파스타', [first, second, unrelated]))
      .toEqual([{ label: '묶인 캡처의 제목', excerpt: '둘째 장 파스타' }]);
  });
});


it('maps case-expanded and non-BMP text back to the saved characters', () => {
  const item = capture(1, '검증', { extractedText: 'İ' + '🙂'.repeat(30) + '연무장길' });
  const rows = getCaptureSearchEvidence(item, '연무장길');
  expect(rows[0].excerpt).toContain('연무장길');
  expect(rows[0].excerpt).not.toContain('�');
});
