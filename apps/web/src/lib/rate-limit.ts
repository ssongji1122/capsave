import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const GUEST_RATE_LIMIT_MAX_REQUESTS = 5;
// Guide drafts per signed-in user per UTC day (decision D5, approved 2026-09-26).
export const GUIDE_DRAFT_DAILY_LIMIT = 5;

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _supabase;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

interface GuestRateLimitRpcRow {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

interface GuestRateLimitRpcClient {
  rpc: (
    fn: 'consume_guest_rate_limit',
    args: { p_ip_key: string; p_max_requests: number; p_cost: number }
  ) => {
    single: () => Promise<{
      data: GuestRateLimitRpcRow | null;
      error: { message?: string } | null;
    }>;
  };
}

function getUtcDay(now: Date): string {
  return now.toISOString().split('T')[0];
}

function getResetAt(now: Date): Date {
  return new Date(`${getUtcDay(now)}T23:59:59.999Z`);
}

export function buildGuestRateLimitKey(ip: string, now: Date = new Date()): string {
  const today = getUtcDay(now);
  return `${ip}:${today}`;
}

// Guide drafts reuse the atomic counter from migration 011; the RPC takes any text key.
export function buildGuideDraftLimitKey(userId: string, now: Date = new Date()): string {
  return `guide-draft:user:${userId}:${getUtcDay(now)}`;
}

async function consumeDailyLimitWithClient(
  client: GuestRateLimitRpcClient,
  key: string,
  maxRequests: number,
  now: Date,
  cost: number
): Promise<RateLimitResult> {
  const fallbackResetAt = getResetAt(now);
  const { data, error } = await client
    .rpc('consume_guest_rate_limit', {
      p_ip_key: key,
      p_max_requests: maxRequests,
      p_cost: Math.max(1, cost),
    })
    .single();

  if (error || !data) {
    console.error('Rate limit consume error:', error ?? 'No data returned');
    return {
      allowed: false,
      remaining: 0,
      resetAt: fallbackResetAt,
    };
  }

  return {
    allowed: data.allowed,
    remaining: Math.max(0, data.remaining),
    resetAt: new Date(data.reset_at || fallbackResetAt),
  };
}

export function consumeGuestRateLimitWithClient(
  client: GuestRateLimitRpcClient,
  ip: string,
  now: Date = new Date(),
  cost = 1
): Promise<RateLimitResult> {
  return consumeDailyLimitWithClient(
    client,
    buildGuestRateLimitKey(ip, now),
    GUEST_RATE_LIMIT_MAX_REQUESTS,
    now,
    cost
  );
}

export function consumeGuideDraftLimitWithClient(
  client: GuestRateLimitRpcClient,
  userId: string,
  now: Date = new Date()
): Promise<RateLimitResult> {
  return consumeDailyLimitWithClient(
    client,
    buildGuideDraftLimitKey(userId, now),
    GUIDE_DRAFT_DAILY_LIMIT,
    now,
    1
  );
}

export function consumeGuestRateLimit(ip: string, cost = 1): Promise<RateLimitResult> {
  return consumeGuestRateLimitWithClient(getSupabase() as unknown as GuestRateLimitRpcClient, ip, new Date(), cost);
}

export function consumeGuideDraftLimit(userId: string): Promise<RateLimitResult> {
  return consumeGuideDraftLimitWithClient(getSupabase() as unknown as GuestRateLimitRpcClient, userId);
}
