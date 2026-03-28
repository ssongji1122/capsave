import { describe, it, expect } from 'vitest';
import { safeJsonParse } from '../utils/json';

describe('safeJsonParse', () => {
  it('parses valid JSON string', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('not json', 'fallback')).toBe('fallback');
  });

  it('returns fallback for empty string', () => {
    expect(safeJsonParse('', [])).toEqual([]);
  });

  it('parses nested objects and arrays', () => {
    const input = '{"items":[{"id":1},{"id":2}],"meta":{"total":2}}';
    const result = safeJsonParse(input, null);
    expect(result).toEqual({ items: [{ id: 1 }, { id: 2 }], meta: { total: 2 } });
  });

  it('parses primitive JSON values', () => {
    expect(safeJsonParse('42', 0)).toBe(42);
    expect(safeJsonParse('"hello"', '')).toBe('hello');
    expect(safeJsonParse('true', false)).toBe(true);
    expect(safeJsonParse('null', 'default')).toBeNull();
  });

  it('returns typed fallback', () => {
    const result: number[] = safeJsonParse('bad', [1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });
});
