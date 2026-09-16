import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  MAGIC_LINK_RATE_LIMITED,
  checkMagicLinkRateLimit,
  configureRateLimitForTests,
  resetRateLimitForTests,
} from "../src/lib/rate-limit";

async function configureMagicLink(
  request: APIRequestContext,
  magicLinkMax: number,
) {
  const res = await request.post("/api/test/rate-limit", {
    data: {
      configure: {
        waitlistMax: 60,
        intentMax: 60,
        magicLinkMax,
        windowMs: 60_000,
      },
    },
  });
  expect(res.ok()).toBeTruthy();
}

async function resetLimits(request: APIRequestContext) {
  const res = await request.post("/api/test/rate-limit", {
    data: { reset: true },
  });
  expect(res.ok()).toBeTruthy();
}

/**
 * Slice 11.2 — rate-limit magic-link POST.
 * Never claims signed in. CLOSE_AT null. No Stripe.
 */
test.describe("slice 11.2: rate-limit magic-link POST", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(async ({ request }) => {
    await resetLimits(request);
    await request.post("/api/test/reset-intents");
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("unit: magic-link copy never claims signed in; limiter trips", () => {
    expect(MAGIC_LINK_RATE_LIMITED.toLowerCase()).toContain("no email was sent");
    expect(MAGIC_LINK_RATE_LIMITED.toLowerCase()).not.toMatch(
      /\b(signed in|you are in|joined)\b/,
    );
    resetRateLimitForTests();
    configureRateLimitForTests({
      waitlistMax: 60,
      intentMax: 60,
      magicLinkMax: 2,
      windowMs: 60_000,
    });
    expect(checkMagicLinkRateLimit("a@example.com", "1.1.1.1").ok).toBe(true);
    expect(checkMagicLinkRateLimit("a@example.com", "1.1.1.1").ok).toBe(true);
    expect(checkMagicLinkRateLimit("a@example.com", "1.1.1.1").ok).toBe(false);
    resetRateLimitForTests();

    const authSrc = readFileSync(
      join(process.cwd(), "src/app/actions/auth.ts"),
      "utf8",
    );
    expect(authSrc).toContain("checkMagicLinkRateLimit");
    expect(authSrc).toContain("MAGIC_LINK_RATE_LIMITED");
  });

  test("API: magic-link rate harness returns 429 without claiming sent", async ({
    request,
  }) => {
    await configureMagicLink(request, 2);
    const email = "ratelimit112@example.com";

    const first = await request.post("/api/test/magic-link-rate", {
      data: { email },
    });
    expect(first.ok()).toBeTruthy();
    const firstBody = (await first.json()) as { ok: boolean; emailed?: boolean };
    expect(firstBody.ok).toBe(true);
    expect(firstBody.emailed).toBe(false);

    const second = await request.post("/api/test/magic-link-rate", {
      data: { email },
    });
    expect(second.ok()).toBeTruthy();

    const third = await request.post("/api/test/magic-link-rate", {
      data: { email },
    });
    expect(third.status()).toBe(429);
    const body = (await third.json()) as {
      ok: boolean;
      error: string;
      code: string;
    };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("rate_limited");
    expect(body.error).toBe(MAGIC_LINK_RATE_LIMITED);
    expect(body.error.toLowerCase()).not.toMatch(/\b(signed in|joined)\b/);
  });
});
