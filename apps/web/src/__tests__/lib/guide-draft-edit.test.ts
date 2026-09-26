import { describe, expect, it } from 'vitest';
import type { CaptureItem, GuideReference } from '@scrave/shared';
import {
  GUIDE_DRAFT_STORAGE_KEY,
  attachGuidePlaceReferences,
  countPickedPlaces,
  getDraftErrorMessage,
  isPickableCapture,
  moveGuidePlace,
  parseStoredGuideDraft,
  removeGuidePlace,
  serializeGuideDraft,
  togglePickedCapture,
  updateGuidePlaceText,
  type StoredGuideDraft,
} from '@/lib/guide-draft-edit';
import { ULUWATU_GUIDE } from '@/lib/public-guides';

const DRAFT = { ...ULUWATU_GUIDE, slug: 'my-guide-abcdefghij', status: 'draft' as const };
const IDS = DRAFT.places.map(({ id }) => id);

function capture(id: number, places: CaptureItem['places']): CaptureItem {
  return {
    id,
    category: 'place',
    title: '캡처',
    summary: '',
    places,
    extractedText: '',
    links: [],
    tags: [],
    source: 'instagram',
    imageUrl: '',
    createdAt: '',
    userId: 'u',
    confidence: 1,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  };
}

describe('picking captures', () => {
  it('adds and removes ids and stops at ten', () => {
    expect(togglePickedCapture([1], 2)).toEqual([1, 2]);
    expect(togglePickedCapture([1, 2], 1)).toEqual([2]);
    const ten = Array.from({ length: 10 }, (_, i) => i + 1);
    expect(togglePickedCapture(ten, 11)).toBe(ten);
  });

  it('only offers place captures that have at least one place', () => {
    expect(isPickableCapture(capture(1, [{ name: 'A' }]))).toBe(true);
    expect(isPickableCapture(capture(2, []))).toBe(false);
    expect(isPickableCapture({ ...capture(3, [{ name: 'A' }]), category: 'text' })).toBe(false);
  });

  it('counts places in picked captures', () => {
    const captures = [capture(1, [{ name: 'A' }, { name: 'B' }]), capture(2, [{ name: 'C' }])];
    expect(countPickedPlaces(captures, [1])).toBe(2);
    expect(countPickedPlaces(captures, [1, 2])).toBe(3);
  });
});

describe('editing a draft', () => {
  it('moves a place and renumbers the sequence', () => {
    const moved = moveGuidePlace(DRAFT, IDS[2]!, -1);
    expect(moved.places.map(({ id }) => id)).toEqual([IDS[0], IDS[2], IDS[1]]);
    expect(moved.places.map(({ sequence }) => sequence)).toEqual([1, 2, 3]);
    expect(DRAFT.places[1]?.id).toBe(IDS[1]);
  });

  it('ignores moves past either end', () => {
    expect(moveGuidePlace(DRAFT, IDS[0]!, -1)).toBe(DRAFT);
    expect(moveGuidePlace(DRAFT, IDS[2]!, 1)).toBe(DRAFT);
  });

  it('removes a place but keeps at least two', () => {
    const removed = removeGuidePlace(DRAFT, IDS[0]!);
    expect(removed.places.map(({ sequence }) => sequence)).toEqual([1, 2]);
    expect(removeGuidePlace(removed, IDS[1]!)).toBe(removed);
  });

  it('updates visit window and before-you-go text', () => {
    const edited = updateGuidePlaceText(DRAFT, IDS[1]!, 'visitWindow', '해 지기 전');
    expect(edited.places[1]?.visitWindow).toBe('해 지기 전');
    expect(updateGuidePlaceText(DRAFT, IDS[1]!, 'practicalNote', '  ').places[1]?.practicalNote).toBe(
      DRAFT.places[1]?.practicalNote
    );
  });

  it('attaches references without duplicating urls', () => {
    const reference: GuideReference = {
      kind: 'review',
      label: '골라 둔 후기',
      publisher: '여행자',
      url: 'https://blog.naver.com/a/1',
      checkedAt: '2026-09-26',
      note: '',
      preview: { title: '후기', description: '' },
    };
    const once = attachGuidePlaceReferences(DRAFT, IDS[0]!, [reference]);
    const twice = attachGuidePlaceReferences(once, IDS[0]!, [reference]);
    expect(twice.places[0]?.references.filter(({ url }) => url === reference.url)).toHaveLength(1);
    expect(twice.places[0]?.references.length).toBe(DRAFT.places[0]!.references.length + 1);
  });
});

describe('session storage of the draft', () => {
  const stored: StoredGuideDraft = {
    guide: DRAFT,
    coverImageUrl: 'captures/u/1.jpg',
    fallback: false,
    unresolved: [{ name: '좌표 없음', captureId: 3 }],
  };

  it('round-trips a draft', () => {
    expect(GUIDE_DRAFT_STORAGE_KEY).toBe('scrave:guide-draft');
    expect(parseStoredGuideDraft(serializeGuideDraft(stored))).toEqual(stored);
  });

  it.each([
    null,
    '',
    '{',
    JSON.stringify({ guide: { ...DRAFT, status: 'published' } }),
    JSON.stringify({ guide: { ...DRAFT, places: [] } }),
    JSON.stringify({ guide: { slug: 'x' } }),
  ])('rejects %s', (text) => {
    expect(parseStoredGuideDraft(text)).toBeNull();
  });
});

describe('getDraftErrorMessage', () => {
  it('explains each failure in plain Korean', () => {
    expect(getDraftErrorMessage(422, { error: 'not-enough-places', unresolved: [{ name: 'A', captureId: 1 }] }))
      .toBe('위치를 아는 장소가 두 곳 이상 필요합니다. 위치를 찾지 못한 장소: A');
    expect(getDraftErrorMessage(422, { error: 'too-many-places' })).toBe(
      '장소가 12곳을 넘습니다. 캡처를 줄여 다시 골라 주세요.'
    );
    expect(getDraftErrorMessage(401, {})).toBe('로그인한 뒤 가이드를 만들 수 있습니다.');
    expect(getDraftErrorMessage(429, { error: 'daily-limit', limit: 5, remaining: 0 })).toBe(
      '오늘 만들 수 있는 가이드 초안 5회를 모두 썼습니다. 내일 다시 시도해 주세요.'
    );
    expect(getDraftErrorMessage(500, {})).toBe('가이드 초안을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
  });
});
