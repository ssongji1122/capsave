import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimiter } from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows requests within limit', () => {
    const limiter = createRateLimiter(3, 60_000);
    expect(limiter.isAllowed('ip1')).toBe(true);
    expect(limiter.isAllowed('ip1')).toBe(true);
    expect(limiter.isAllowed('ip1')).toBe(true);
  });

  it('blocks requests over limit', () => {
    const limiter = createRateLimiter(2, 60_000);
    limiter.isAllowed('ip1');
    limiter.isAllowed('ip1');
    expect(limiter.isAllowed('ip1')).toBe(false);
  });

  it('tracks different keys independently', () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.isAllowed('ip1')).toBe(true);
    expect(limiter.isAllowed('ip2')).toBe(true);
    expect(limiter.isAllowed('ip1')).toBe(false);
  });

  it('resets after window expires', () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.isAllowed('ip1')).toBe(true);
    expect(limiter.isAllowed('ip1')).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(limiter.isAllowed('ip1')).toBe(true);
  });

  it('returns remaining count', () => {
    const limiter = createRateLimiter(3, 60_000);
    expect(limiter.remaining('ip1')).toBe(3);
    limiter.isAllowed('ip1');
    expect(limiter.remaining('ip1')).toBe(2);
  });
});
