/**
 * In-memory token-bucket rate limiter.
 *
 * Edge-safe: no Node.js imports, so it can be used from middleware.ts.
 * NOTE: buckets live per server instance. For multi-instance production,
 * replace with a shared store (Redis/Upstash) — see BUILD_NOTES.md.
 */

interface Bucket {
  tokens: number;
  last: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** ms until at least one token is available again */
  resetMs: number;
  limit: number;
}

export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: limit, last: now };
    buckets.set(key, bucket);
  }

  const elapsed = now - bucket.last;
  bucket.tokens = Math.min(limit, bucket.tokens + (elapsed / windowMs) * limit);
  bucket.last = now;

  // Opportunistic cleanup so the map cannot grow unboundedly.
  if (buckets.size > 20_000) {
    for (const [k, b] of buckets) {
      if (now - b.last > windowMs * 2) buckets.delete(k);
      if (buckets.size < 15_000) break;
    }
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetMs: 0,
      limit,
    };
  }
  const msPerToken = windowMs / limit;
  return {
    allowed: false,
    remaining: 0,
    resetMs: Math.ceil(msPerToken - (elapsed % msPerToken)),
    limit,
  };
}
