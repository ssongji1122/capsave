interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiter {
  isAllowed(key: string): boolean;
}

export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const store = new Map<string, RateLimitEntry>();

  function getEntry(key: string): RateLimitEntry {
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
