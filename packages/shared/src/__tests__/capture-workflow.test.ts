import { describe, it, expect } from 'vitest';
import { extractCaptureActions } from '../utils/capture-actions';
import { EMPTY_CAPTURE_META, filterCapturesByLens, getRevisitDate, getCaptureMeta, saveCaptureMeta } from '../utils/capture-intent';
const capture = { id: 1, title: '예약', summary: '', extractedText: '예약번호: AB12345 문의 010-1234-5678', places: [], tags: [], links: [] };
describe('shared capture workflow for web and native', () => {
  it('keeps native captures without web-only fields usable and only marks explicit completion', () => {
    const actions = extractCaptureActions(capture);
    expect(actions.map(a => a.kind)).toEqual(['phone', 'reservation_code']);
    expect(filterCapturesByLens([capture], {}, 'action-pending')).toEqual([capture]);
    const meta = { ...EMPTY_CAPTURE_META, completedActions: actions.map(a => a.id) };
    expect(filterCapturesByLens([capture], {1: meta}, 'action-pending')).toEqual([]);
  });
  it('round-trips metadata with the existing web storage contract', () => {
    const entries = new Map<string,string>();
    const storage = { getItem: (k:string) => entries.get(k) ?? null, setItem: (k:string,v:string) => {entries.set(k,v);} };
    const meta = {...EMPTY_CAPTURE_META, reasons:['reference' as const], note:'구도 참고', revisit:'week' as const, revisitOn:getRevisitDate('week', new Date('2026-10-30T23:30:00Z'))};
    expect(saveCaptureMeta(storage,1,meta)).toBe(true);
    expect(getCaptureMeta(storage,1)).toMatchObject({...meta, revisitOn:'2026-11-07',updatedAt:expect.any(String)});
    expect(filterCapturesByLens([capture],{1:meta},'rediscover')).toEqual([capture]);
  });
});
