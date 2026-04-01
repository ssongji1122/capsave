import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

async function getTodayKey(ip: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  return `${ip}:${today}`;
}

export async function checkGuestRateLimit(ip: string): Promise<RateLimitResult> {
  const key = await getTodayKey(ip);
  const today = new Date().toISOString().split('T')[0];
  const resetAt = new Date(today + 'T23:59:59.999Z');

  const { data, error } = await supabase
    .from('guest_rate_limits')
    .select('count')
    .eq('ip_key', key)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: 5, resetAt };
  }

  const currentCount = data?.count ?? 0;
  const maxRequests = 5;
  const remaining = Math.max(0, maxRequests - currentCount);

  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt };
  }

  return { allowed: true, remaining, resetAt };
}

export async function incrementGuestRateLimit(ip: string): Promise<void> {
  const key = await getTodayKey(ip);

  const { data, error } = await supabase
    .from('guest_rate_limits')
    .select('count')
    .eq('ip_key', key)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error:', error);
    return;
  }

  if (data) {
    await supabase
      .from('guest_rate_limits')
      .update({ count: data.count + 1 })
      .eq('ip_key', key);
  } else {
    await supabase
      .from('guest_rate_limits')
      .insert({ ip_key: key, count: 1 });
  }
}

interface RateLimiter {
  isAllowed(key: string): boolean;
}

export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const store = new Map<string, { count: number; resetAt: number }>();

  function getEntry(key: string): { count: number; resetAt: number } {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now >= existing.resetAt) {
      const entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
      return entry;
    }

    return existing;
  }

  return {
    isAllowed(key: string): boolean {
      const entry = getEntry(key);
      if (entry.count >= maxRequests) return false;
      entry.count++;
      return true;
    },
  };
}
