// Best-effort fixed-window rate limiter keyed by client IP.
//
// State lives in Worker isolate memory: it resets whenever the isolate is
// recycled and is not shared across Cloudflare's edge locations or between
// concurrent isolates, so it bounds abuse per isolate rather than enforcing
// an exact global limit. Good enough for a public docs helper; upgrade to
// Durable Objects / the Rate Limiting binding if it ever needs to be strict.

export interface RateLimiter {
  /** Returns true when the request is allowed, false when over the limit. */
  check(key: string, now?: number): boolean;
}

const MAX_TRACKED_KEYS = 10_000;

export function createRateLimiter(limit = 10, windowMs = 60_000): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    check(key, now = Date.now()) {
      const window = windows.get(key);
      if (!window || now - window.start >= windowMs) {
        if (windows.size >= MAX_TRACKED_KEYS) windows.clear(); // keep memory bounded
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      window.count += 1;
      return window.count <= limit;
    },
  };
}
