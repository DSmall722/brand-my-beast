/**
 * Process-local fixed-window limiter for waitlist + intent POSTs (slice 6.6).
 * Ephemeral throttle state only — not a durable store (6.7 owns Production memory).
 */

export type RateLimitScope = "waitlist" | "intent";

type Bucket = { count: number; windowStart: number };

type TestConfig = {
  waitlistMax: number;
  intentMax: number;
  windowMs: number;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbRateLimitBuckets?: Map<string, Bucket>;
  __bmbRateLimitTestConfig?: TestConfig | null;
};

function buckets(): Map<string, Bucket> {
  if (!globalStore.__bmbRateLimitBuckets) {
    globalStore.__bmbRateLimitBuckets = new Map();
  }
  return globalStore.__bmbRateLimitBuckets;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function limits(scope: RateLimitScope): { max: number; windowMs: number } {
  const test = globalStore.__bmbRateLimitTestConfig;
  if (test) {
    return {
      max: scope === "waitlist" ? test.waitlistMax : test.intentMax,
      windowMs: test.windowMs,
    };
  }
  return {
    max:
      scope === "waitlist"
        ? envInt("RATE_LIMIT_WAITLIST_MAX", 60)
        : envInt("RATE_LIMIT_INTENT_MAX", 60),
    windowMs: envInt("RATE_LIMIT_WINDOW_MS", 60_000),
  };
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/** Consume one attempt. Returns ok:false when the window is already full. */
export function checkRateLimit(
  scope: RateLimitScope,
  key: string,
): RateLimitResult {
  const trimmed = key.trim() || "unknown";
  const { max, windowMs } = limits(scope);
  const store = buckets();
  const bucketKey = `${scope}:${trimmed}`;
  const now = Date.now();
  let bucket = store.get(bucketKey);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 0, windowStart: now };
    store.set(bucketKey, bucket);
  }
  if (bucket.count >= max) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((bucket.windowStart + windowMs - now) / 1000),
    );
    return { ok: false, retryAfterSec };
  }
  bucket.count += 1;
  return { ok: true };
}

export function resetRateLimitForTests(): void {
  buckets().clear();
  globalStore.__bmbRateLimitTestConfig = null;
}

/** CI-only: lower ceilings so Playwright can trip 429 without flooding. */
export function configureRateLimitForTests(
  config: {
    waitlistMax: number;
    intentMax: number;
    windowMs?: number;
  } | null,
): void {
  if (config === null) {
    globalStore.__bmbRateLimitTestConfig = null;
  } else {
    globalStore.__bmbRateLimitTestConfig = {
      waitlistMax: config.waitlistMax,
      intentMax: config.intentMax,
      windowMs: config.windowMs ?? 60_000,
    };
  }
  buckets().clear();
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
