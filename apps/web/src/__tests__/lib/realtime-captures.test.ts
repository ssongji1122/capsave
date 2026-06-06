import { describe, expect, it } from 'vitest';
import {
  applyRealtimeCaptureDelete,
  applyRealtimeCaptureInsert,
  applyRealtimeCaptureUpdate,
} from '@/lib/realtime-captures';
import type { CaptureItem } from '@scrave/shared';

function capture(
  id: number,
  title: string,
  deletedAt: string | null = null,
  userId = 'user-1'
): CaptureItem {
  return {
    id,
    title,
    deletedAt,
    category: 'text',
    summary: '',
    places: [],
    extractedText: '',
    links: [],
    tags: [],
    source: 'other',
    imageUrl: '',
    createdAt: '2026-05-20T00:00:00.000Z',
    userId,
    confidence: 1,
    reclassifiedAt: null,
    sourceAccountId: null,
  };
}

describe('realtime capture reducers', () => {
  it('prepends inserted captures when they are not already present', () => {
    const existing = [capture(1, '기존')];
    expect(applyRealtimeCaptureInsert(existing, capture(2, '신규')).map((c) => c.id)).toEqual([2, 1]);
  });

  it('ignores duplicate inserts', () => {
    const existing = [capture(1, '기존')];
    expect(applyRealtimeCaptureInsert(existing, capture(1, '중복'))).toBe(existing);
  });

  it('ignores inserted rows that are already soft-deleted', () => {
    const existing = [capture(1, '기존')];
    expect(applyRealtimeCaptureInsert(existing, capture(2, '삭제됨', '2026-05-20T01:00:00.000Z'))).toBe(existing);
  });

  it('ignores inserted rows that belong to another user', () => {
    const existing = [capture(1, '기존')];
    expect(applyRealtimeCaptureInsert(existing, capture(2, '다른 사용자', null, 'user-2'), 'user-1')).toBe(existing);
  });

  it('replaces an existing capture on non-deleted updates', () => {
    const existing = [capture(1, '이전'), capture(2, '다른 캡처')];
    const updated = applyRealtimeCaptureUpdate(existing, capture(1, '변경'));
    expect(updated.map((c) => c.title)).toEqual(['변경', '다른 캡처']);
  });

  it('ignores updated rows that belong to another user', () => {
    const existing = [capture(1, '기존')];
    expect(applyRealtimeCaptureUpdate(existing, capture(1, '다른 사용자 변경', null, 'user-2'), 'user-1')).toBe(existing);
  });

  it('removes a capture when realtime update marks it as soft-deleted', () => {
    const existing = [capture(1, '삭제 대상'), capture(2, '유지')];
    const updated = applyRealtimeCaptureUpdate(
      existing,
      capture(1, '삭제 대상', '2026-05-20T01:00:00.000Z')
    );
    expect(updated.map((c) => c.id)).toEqual([2]);
  });

  it('removes a capture on delete events', () => {
    const existing = [capture(1, '삭제 대상'), capture(2, '유지')];
    expect(applyRealtimeCaptureDelete(existing, 1).map((c) => c.id)).toEqual([2]);
  });
});
