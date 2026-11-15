/**
 * Simple in-memory rate limiter untuk Vercel Edge/Node
 * Untuk production yang lebih robust, gunakan Upstash Redis
 *
 * Vercel serverless functions tidak share memori antar instance,
 * jadi ini efektif untuk single-instance tapi mungkin tidak 100%
 * di multi-instance. Cukup untuk mencegah abuse dasar.
 */

interface RateLimitEntry {
  count:     number;
  resetAt:   number;
}

// Map: ip → { count, resetAt }
const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries setiap 5 menit
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (entry.resetAt < now) store.delete(key);
  });
}

export interface RateLimitConfig {
  windowMs: number;
  max:      number;
}

export interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;
  resetAt:    number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now   = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

/** Pre-configured rate limit presets for common use cases */
export const RATE_LIMITS = {
  /** Mutation actions by authenticated user: 30/min */
  MUTATION:    { windowMs: 60_000,       max: 30  },
  /** Sensitive auth/onboarding: 10/min */
  AUTH:        { windowMs: 60_000,       max: 10  },
  /** Public booking: 5 per 10 min */
  BOOKING:     { windowMs: 10 * 60_000,  max: 5   },
  /** Payment transactions: 10 per 10 min */
  PAYMENT:     { windowMs: 10 * 60_000,  max: 10  },
  /** Subdomain check: 30/min */
  ENUM_CHECK:  { windowMs: 60_000,       max: 30  },
  /** QRIS generation: 30/min */
  QRIS:        { windowMs: 60_000,       max: 30  },
  /** File uploads: 20/min */
  UPLOAD:      { windowMs: 60_000,       max: 20  },
} as const;

/** Helper: check rate limit and return 429 response if exceeded */
export function enforceRateLimit(
  request: Request,
  key: string,
  config: RateLimitConfig
): Response | null {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${key}:${ip}`, config);
  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: "Terlalu banyak percobaan. Coba lagi nanti." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }
  return null;
}
