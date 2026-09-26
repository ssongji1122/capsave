import { describe, it, expect, vi } from 'vitest';
import {
  GUEST_RATE_LIMIT_MAX_REQUESTS,
  GUIDE_DRAFT_DAILY_LIMIT,
  buildGuestRateLimitKey,
  buildGuideDraftLimitKey,
  consumeGuestRateLimitWithClient,
  consumeGuideDraftLimitWithClient,
} from '@/lib/rate-limit';

function createRpcClient(response: {
  data?: {
    allowed: boolean;
    remaining: number;
    reset_at: string;
  } | null;
  error?: { message: string } | null;
}) {
  const single = vi.fn().mockResolvedValue({
    data: response.data ?? null,
    error: response.error ?? null,
  });
  const rpc = vi.fn().mockReturnValue({ single });

  return { client: { rpc }, rpc, single };
}

describe('guest DB rate limit', () => {
  it('builds a stable UTC day key from IP and date', () => {
    const now = new Date('2026-05-20T23:59:58.000Z');
    expect(buildGuestRateLimitKey('203.0.113.7', now)).toBe('203.0.113.7:2026-05-20');
  });

  it('consumes the limit through the atomic database function', async () => {
    const resetAt = '2026-05-20T23:59:59.999Z';
    const { client, rpc, single } = createRpcClient({
      data: { allowed: true, remaining: 4, reset_at: resetAt },
    });

    const result = await consumeGuestRateLimitWithClient(
      client,
      '203.0.113.7',
      new Date('2026-05-20T12:00:00.000Z')
    );

    expect(rpc).toHaveBeenCalledWith('consume_guest_rate_limit', {
      p_ip_key: '203.0.113.7:2026-05-20',
      p_max_requests: GUEST_RATE_LIMIT_MAX_REQUESTS,
      p_cost: 1,
    });
    expect(single).toHaveBeenCalled();
    expect(result).toEqual({
      allowed: true,
      remaining: 4,
      resetAt: new Date(resetAt),
    });
  });

  it('can consume multiple units for a batch request', async () => {
    const resetAt = '2026-05-20T23:59:59.999Z';
    const { client, rpc } = createRpcClient({
      data: { allowed: true, remaining: 2, reset_at: resetAt },
    });

    const result = await consumeGuestRateLimitWithClient(
      client,
      '203.0.113.7',
      new Date('2026-05-20T12:00:00.000Z'),
      3
    );

    expect(rpc).toHaveBeenCalledWith('consume_guest_rate_limit', {
      p_ip_key: '203.0.113.7:2026-05-20',
      p_max_requests: GUEST_RATE_LIMIT_MAX_REQUESTS,
      p_cost: 3,
    });
    expect(result).toEqual({
      allowed: true,
      remaining: 2,
      resetAt: new Date(resetAt),
    });
  });

  it('returns blocked when the database function reports the limit is exhausted', async () => {
    const { client } = createRpcClient({
      data: {
        allowed: false,
        remaining: 0,
        reset_at: '2026-05-20T23:59:59.999Z',
      },
    });

    const result = await consumeGuestRateLimitWithClient(
      client,
      '203.0.113.7',
      new Date('2026-05-20T12:00:00.000Z')
    );

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('fails closed when the database function is unavailable', async () => {
    const { client } = createRpcClient({
      error: { message: 'function missing' },
    });

    const result = await consumeGuestRateLimitWithClient(
      client,
      '203.0.113.7',
      new Date('2026-05-20T12:00:00.000Z')
    );

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe('guide draft daily limit per user', () => {
  it('allows five drafts a day', () => {
    expect(GUIDE_DRAFT_DAILY_LIMIT).toBe(5);
  });

  it('keys the counter by user and UTC day, apart from guest IP keys', () => {
    const now = new Date('2026-09-26T23:59:58.000Z');
    expect(buildGuideDraftLimitKey('user-1', now)).toBe('guide-draft:user:user-1:2026-09-26');
  });

  it('consumes one unit through the same atomic database function', async () => {
    const resetAt = '2026-09-26T23:59:59.999Z';
    const { client, rpc } = createRpcClient({
      data: { allowed: true, remaining: 4, reset_at: resetAt },
    });

    const result = await consumeGuideDraftLimitWithClient(
      client,
      'user-1',
      new Date('2026-09-26T12:00:00.000Z')
    );

    expect(rpc).toHaveBeenCalledWith('consume_guest_rate_limit', {
      p_ip_key: 'guide-draft:user:user-1:2026-09-26',
      p_max_requests: GUIDE_DRAFT_DAILY_LIMIT,
      p_cost: 1,
    });
    expect(result).toEqual({ allowed: true, remaining: 4, resetAt: new Date(resetAt) });
  });

  it('refuses when the counter cannot be read', async () => {
    const { client } = createRpcClient({ error: { message: 'db down' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await consumeGuideDraftLimitWithClient(
      client,
      'user-1',
      new Date('2026-09-26T12:00:00.000Z')
    );

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: new Date('2026-09-26T23:59:59.999Z'),
    });
  });
});
