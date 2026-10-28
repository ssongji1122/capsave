import { describe, expect, it } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import {
  INTENT_STORAGE_KEY,
  EMPTY_INTENT,
  REASONS,
  buildReferenceNote,
  buildCaptureReferenceNote,
  findCapture,
  getConfirmedInterests,
  getRevisitDate,
  parseSavedIntent,
  saveIntent,
  getCaptureMeta,
  saveCaptureMeta,
  toggleCompletedAction,
  filterCapturesByLens,
  EMPTY_CAPTURE_META,
} from '@/lib/capture-intent';
import { FIGURE_CAPTURE } from '@/lib/figure-capture';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

function makeCapture(id: number, overrides: Partial<CaptureItem> = {}): CaptureItem {
  return {
    id,
    category: 'text',
    title: `캡처 ${id}`,
    summary: '요약 텍스트',
    places: [],
    extractedText: '추출된 원문 텍스트',
    links: [],
    tags: ['디자인'],
    source: 'instagram',
    imageUrl: 'data:image/png;base64,aW1hZ2U=',
    createdAt: '2026-10-09T09:00:00.000Z',
    userId: 'user-1',
    confidence: 0.95,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: '@studio_soluta',
    ...overrides,
  };
}

describe('capture-intent legacy figure-capture support', () => {
  it('saves and restores figure capture intent and builds reference note', () => {
    const storage = createMemoryStorage();
    const intent = {
      ...EMPTY_INTENT,
      reasons: [REASONS[0].id, REASONS[3].id] as const,
      note: '보라색 대비 참고',
      revisit: 'week' as const,
      revisitOn: getRevisitDate('week', new Date('2026-10-09T00:00:00Z')),
      savedAt: '2026-10-09T01:00:00.000Z',
    };

    expect(saveIntent(storage, intent)).toBe(true);
    const restored = parseSavedIntent(storage.getItem('scrave.capture-intent.v1'));
    expect(restored.reasons).toEqual(['color', 'use']);
    expect(getConfirmedInterests(restored)).toEqual(['색감', '작업 참고']);
    expect(findCapture(FIGURE_CAPTURE, restored, '보라색 대비')).toBe(true);

    const note = buildReferenceNote(FIGURE_CAPTURE, restored);
    expect(note).toContain('# FIGURE (2)');
    expect(note).toContain('색감, 작업 참고');
    expect(note).toContain('보라색 대비 참고');
  });
});

describe('per-capture metadata and lens filtering', () => {
  it('persists per-capture reasons, revisit context, travel pin, and completed actions', () => {
    const storage = createMemoryStorage();
    const updated = saveCaptureMeta(storage, 42, {
      ...EMPTY_CAPTURE_META,
      reasons: ['reference', 'color'],
      note: '패키지 일러스트 톤앤매너 참고',
      revisit: 'work',
      pinnedToTravelPack: true,
      completedActions: ['phone:010-1234-5678'],
    });

    expect(updated).toBe(true);
    const loaded = getCaptureMeta(storage, 42);
    expect(loaded.reasons).toEqual(['reference', 'color']);
    expect(loaded.revisit).toBe('work');
    expect(loaded.pinnedToTravelPack).toBe(true);
    expect(loaded.completedActions).toEqual(['phone:010-1234-5678']);

    const toggled = toggleCompletedAction(loaded, 'phone:010-1234-5678');
    expect(toggled.completedActions).toEqual([]);
  });

  it('builds a markdown reference note separating AI observations from user intent', () => {
    const item = makeCapture(7, {
      title: '울루와뚜 절벽 카페 캡처',
      sourceAccountId: '@bali_archive',
      links: ['https://instagram.com/p/example'],
      keyInsights: ['선셋 1시간 전 방문 권장'],
    });
    const meta = {
      ...EMPTY_CAPTURE_META,
      reasons: ['visit', 'reference'] as const,
      note: '발리 일정 2일차 후보',
      revisit: 'travel' as const,
    };

    const md = buildCaptureReferenceNote(item, meta);
    expect(md).toContain('# 울루와뚜 절벽 카페 캡처');
    expect(md).toContain('@bali_archive');
    expect(md).toContain('방문 후보');
    expect(md).toContain('발리 일정 2일차 후보');
    expect(md).toContain('선셋 1시간 전 방문 권장');
  });

  it('filters captures by lens (travel-pack, action-pending, rediscover)', () => {
    const c1 = makeCapture(1, {
      title: '대한항공 항공권 예약번호 KE123',
      extractedText: '예약번호: AB99CD',
    });
    const c2 = makeCapture(2, {
      title: '성수 인쇄소 연락처',
      extractedText: '문의: 02-333-4444',
    });
    const c3 = makeCapture(3, {
      title: '유화 질감 레퍼런스',
      extractedText: 'Oil on linen',
    });

    const metaMap = {
      3: {
        ...EMPTY_CAPTURE_META,
        reasons: ['reference'] as const,
        revisit: 'work' as const,
        note: '다음 룩북 배경 질감 참고',
      },
    };

    const travelList = filterCapturesByLens([c1, c2, c3], metaMap, 'travel-pack');
    expect(travelList.map((c) => c.id)).toEqual([1]);

    const actionList = filterCapturesByLens([c1, c2, c3], metaMap, 'action-pending');
    expect(actionList.map((c) => c.id)).toEqual([1, 2]);

    const rediscoverList = filterCapturesByLens([c1, c2, c3], metaMap, 'rediscover');
    expect(rediscoverList.map((c) => c.id)).toEqual([3]);
  });
});

describe('capture intent and evidence', () => {
  it('never turns model observations into personal preferences', () => {
    expect(getConfirmedInterests(EMPTY_INTENT)).toEqual([]);
    expect(getConfirmedInterests({ ...EMPTY_INTENT, reasons: ['color', 'texture'] }))
      .toEqual(['색감', '질감']);
  });
  it('finds actual observations and user notes, excluding the secondary post', () => {
    expect(findCapture(FIGURE_CAPTURE, EMPTY_INTENT, '보라색 노란색')).toBe(true);
    expect(findCapture(FIGURE_CAPTURE, EMPTY_INTENT, 'timeforart')).toBe(false);
    expect(findCapture(FIGURE_CAPTURE, EMPTY_INTENT, '제주')).toBe(false);
    expect(findCapture(FIGURE_CAPTURE, { ...EMPTY_INTENT, note: '가을 포스터 참고' }, '가을 포스터')).toBe(true);
  });
  it('round-trips explicit choices and keeps empty intent unselected', () => {
    const state = { ...EMPTY_INTENT, reasons: ['texture'] as const, note: '표면 참고', savedAt: '2026-10-09T00:00:00.000Z' };
    let stored = '';
    expect(saveIntent({ setItem: (key, value) => { expect(key).toBe(INTENT_STORAGE_KEY); stored = value; } }, state)).toBe(true);
    expect(parseSavedIntent(stored)).toEqual(state);
    expect(parseSavedIntent(null)).toEqual(EMPTY_INTENT);
  });
  it('rejects corrupted, unsupported and unrelated browser records', () => {
    for (const raw of ['{', '{}', 'null', JSON.stringify({ version: 1, captureId: 'other', intent: EMPTY_INTENT }),
      JSON.stringify({ version: 1, captureId: FIGURE_CAPTURE.id, intent: { ...EMPTY_INTENT, reasons: ['invented'] } })]) {
      expect(parseSavedIntent(raw)).toEqual(EMPTY_INTENT);
    }
  });
  it('does not claim persistence when browser storage fails', () => {
    expect(saveIntent({ setItem: () => { throw new Error('quota'); } }, EMPTY_INTENT)).toBe(false);
  });
  it('uses a calendar date for the chosen revisit, without scheduling a notification', () => {
    expect(getRevisitDate('week', new Date('2026-10-09T03:00:00+09:00'))).toBe('2026-10-16');
    expect(getRevisitDate('work', new Date('2026-10-09T03:00:00+09:00'))).toBeNull();
  });
  it('exports source evidence, explicit intent and uncertainty separately', () => {
    const text = buildReferenceNote(FIGURE_CAPTURE, { ...EMPTY_INTENT, reasons: ['color'], note: '포스터 참고' });
    expect(text).toContain('jasonandersonart');
    expect(text).toContain('30 x 30cm');
    expect(text).toContain('포스터 참고');
    expect(text).toContain('원문 게시물 주소는 확인하지 않았습니다');
    expect(text).not.toContain('timeforart');
  });
});
