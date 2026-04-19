import { describe, it, expect } from 'vitest';
import { shouldNotify, DAU_THRESHOLD } from '@/lib/dau-counter';

describe('shouldNotify', () => {
  it('does not notify below threshold', () => {
    expect(shouldNotify(5, 10, false)).toBe(false);
    expect(shouldNotify(9, 10, false)).toBe(false);
  });

  it('notifies at threshold when not already notified', () => {
    expect(shouldNotify(10, 10, false)).toBe(true);
  });

  it('notifies above threshold when not already notified', () => {
    expect(shouldNotify(15, 10, false)).toBe(true);
  });

  it('does not notify when already notified, even above threshold', () => {
    expect(shouldNotify(15, 10, true)).toBe(false);
  });

  it('exposes the production threshold constant', () => {
    expect(DAU_THRESHOLD).toBe(10);
  });
});
