/**
 * Process-local fixed-window limiter for waitlist + intent + magic-link +
 * operator decide POSTs.
 * Ephemeral throttle state only — not a durable ledger (6.7 gates Production memory).
 */

export type RateLimitScope =
  | "waitlist"
  | "intent"
  | "magic-link"
  | "operator-decide";

type Bucket = { count: number; windowStart: number };

type TestConfig = {
  waitlistMax: number;
  intentMax: number;
  magicLinkMax: number;
  operatorDecideMax: number;
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

function maxForScope(scope: RateLimitScope, test: TestConfig): number {
  switch (scope) {
    case "waitlist":
      return test.waitlistMax;
    case "intent":
      return test.intentMax;
    case "magic-link":
      return test.magicLinkMax;
    case "operator-decide":
      return test.operatorDecideMax;
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

function limits(scope: RateLimitScope): { max: number; windowMs: number } {
  const test = globalStore.__bmbRateLimitTestConfig;
  if (test) {
    return {
      max: maxForScope(scope, test),
      windowMs: test.windowMs,
    };
  }
  const windowMs = envInt("RATE_LIMIT_WINDOW_MS", 60_000);
  switch (scope) {
    case "waitlist":
      return { max: envInt("RATE_LIMIT_WAITLIST_MAX", 60), windowMs };
    case "intent":
      return { max: envInt("RATE_LIMIT_INTENT_MAX", 60), windowMs };
    case "magic-link":
      return { max: envInt("RATE_LIMIT_MAGIC_LINK_MAX", 10), windowMs };
    case "operator-decide":
      return { max: envInt("RATE_LIMIT_OPERATOR_DECIDE_MAX", 30), windowMs };
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
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
    magicLinkMax?: number;
    operatorDecideMax?: number;
    windowMs?: number;
  } | null,
): void {
  if (config === null) {
    globalStore.__bmbRateLimitTestConfig = null;
  } else {
    globalStore.__bmbRateLimitTestConfig = {
      waitlistMax: config.waitlistMax,
      intentMax: config.intentMax,
      magicLinkMax: config.magicLinkMax ?? config.intentMax,
      operatorDecideMax: config.operatorDecideMax ?? config.intentMax,
      windowMs: config.windowMs ?? 60_000,
    };
  }
  buckets().clear();
}

export function clientIpFromHeaders(headers: {
  get(name: string): string | null;
}): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function clientIpFromRequest(request: Request): string {
  return clientIpFromHeaders(request.headers);
}

/** Slice 11.2 — magic-link rate-limit copy. Never claims signed in. */
export const MAGIC_LINK_RATE_LIMITED =
  "Too many sign-in link attempts. No email was sent. Wait a moment and try again.";

export function magicLinkRateKey(email: string, ip: string): string {
  return `email:${email.trim().toLowerCase()}|ip:${ip.trim() || "unknown"}`;
}

/** Shared gate for the magic-link action and CI harness. */
export function checkMagicLinkRateLimit(
  email: string,
  ip: string,
): RateLimitResult {
  return checkRateLimit("magic-link", magicLinkRateKey(email, ip));
}

/**
 * Slice 13.33 — operator approve/reject rate-limit copy.
 * Never claims a decision landed.
 */
export const OPERATOR_DECIDE_RATE_LIMITED =
  "Too many operator decisions. No approve or reject was recorded. Wait a moment and try again.";

export function operatorDecideRateKey(email: string): string {
  return `operator:${email.trim().toLowerCase() || "unknown"}`;
}

export function checkOperatorDecideRateLimit(email: string): RateLimitResult {
  return checkRateLimit("operator-decide", operatorDecideRateKey(email));
}
