import { describe, expect, it } from 'vitest';
import { swipeStep } from '@/lib/capture-swipe';
describe('capture swipe intent', () => {
  it('requires a horizontal gesture and ignores taps and vertical scrolling', () => {
    expect(swipeStep(8, 2)).toBe(0);
    expect(swipeStep(80, 120)).toBe(0);
    expect(swipeStep(-80, 12)).toBe(1);
    expect(swipeStep(80, 12)).toBe(-1);
  });
});
