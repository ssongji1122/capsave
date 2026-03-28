import { describe, it, expect } from 'vitest';
import { countDistinctUsers } from '../utils/analytics';

describe('countDistinctUsers', () => {
  it('counts distinct user_ids', () => {
    const rows = [
      { user_id: 'a' },
      { user_id: 'b' },
      { user_id: 'a' },
      { user_id: 'c' },
    ];
    expect(countDistinctUsers(rows)).toBe(3);
  });

  it('returns 0 for empty array', () => {
    expect(countDistinctUsers([])).toBe(0);
  });

  it('ignores null user_ids', () => {
    const rows = [
      { user_id: 'a' },
      { user_id: null },
      { user_id: 'b' },
      { user_id: null },
    ];
    expect(countDistinctUsers(rows)).toBe(2);
  });

  it('returns 1 for all same user_id', () => {
    const rows = [
      { user_id: 'same' },
      { user_id: 'same' },
      { user_id: 'same' },
    ];
    expect(countDistinctUsers(rows)).toBe(1);
  });
});
