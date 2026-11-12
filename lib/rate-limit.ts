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
  // Array.from() agar kompatibel dengan semua TypeScript target
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (entry.resetAt < now) store.delete(key);
  });
}

export interface RateLimitConfig {
  windowMs: number;  // window dalam ms
  max:      number;  // max request per window
}

export interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;
  resetAt:    number;
}

/**
 * Periksa rate limit untuk identifier (biasanya IP)
 * Returns { allowed: false } jika limit terlampaui
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now    = Date.now();
  const key    = identifier;
  const entry  = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Window baru
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Ambil IP dari request (kompatibel dengan Vercel/Cloudflare)
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  return (
    headers.get("cf-connecting-ip") ||     // Cloudflare
    headers.get("x-real-ip") ||            // Nginx proxy
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}
