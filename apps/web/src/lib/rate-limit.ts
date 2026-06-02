import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const GUEST_RATE_LIMIT_MAX_REQUESTS = 5;

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

export async function consumeGuestRateLimitWithClient(
  client: GuestRateLimitRpcClient,
  ip: string,
  now: Date = new Date(),
  cost = 1
): Promise<RateLimitResult> {
  const fallbackResetAt = getResetAt(now);
  const { data, error } = await client
    .rpc('consume_guest_rate_limit', {
      p_ip_key: buildGuestRateLimitKey(ip, now),
      p_max_requests: GUEST_RATE_LIMIT_MAX_REQUESTS,
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

export function consumeGuestRateLimit(ip: string, cost = 1): Promise<RateLimitResult> {
  return consumeGuestRateLimitWithClient(getSupabase() as unknown as GuestRateLimitRpcClient, ip, new Date(), cost);
}
