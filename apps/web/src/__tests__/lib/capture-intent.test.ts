import { describe, expect, it } from 'vitest';
import {
  EMPTY_INTENT, INTENT_STORAGE_KEY, buildReferenceNote, findCapture,
  parseSavedIntent, saveIntent, getConfirmedInterests, getRevisitDate,
} from '@/lib/capture-intent';
import { FIGURE_CAPTURE } from '@/lib/figure-capture';

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
