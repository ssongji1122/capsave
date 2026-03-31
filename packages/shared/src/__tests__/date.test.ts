import { describe, it, expect } from 'vitest';
import { getDayBoundaries } from '../utils/date';

describe('getDayBoundaries', () => {
  it('returns start and end for a specific date', () => {
    const { start, end } = getDayBoundaries('2026-03-28');
    expect(start).toBe('2026-03-28');
    expect(end).toBe('2026-03-29');
  });

  it('handles month-end boundary', () => {
    const { start, end } = getDayBoundaries('2026-03-31');
    expect(start).toBe('2026-03-31');
    expect(end).toBe('2026-04-01');
  });

  it('handles year-end boundary', () => {
    const { start, end } = getDayBoundaries('2026-12-31');
    expect(start).toBe('2026-12-31');
    expect(end).toBe('2027-01-01');
  });

  it('handles leap year Feb 28', () => {
    const { start, end } = getDayBoundaries('2028-02-28');
    expect(start).toBe('2028-02-28');
    expect(end).toBe('2028-02-29');
  });

  it('returns today when no argument given', () => {
    const { start, end } = getDayBoundaries();
    const today = new Date().toISOString().split('T')[0];
    expect(start).toBe(today);
    // end should be tomorrow
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(end).toBe(tomorrow);
  });
});
