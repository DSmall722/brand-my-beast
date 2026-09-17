import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  isProductionRuntime,
  testApiBlockedResponse,
} from "../src/lib/test-api-gate";

/**
 * Slice 7.3 — `/api/test/*` returns 404 when VERCEL_ENV=production or
 * NODE_ENV=production. Test-mode still works in CI (AUTH_MODE=test, non-prod).
 */
test.describe("slice 7.3: test API blocked in production", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
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

  test("isProductionRuntime is true when either env is production", () => {
    expect(isProductionRuntime({ VERCEL_ENV: "production" })).toBe(true);
    expect(isProductionRuntime({ NODE_ENV: "production" })).toBe(true);
    expect(
      isProductionRuntime({
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toBe(true);
    expect(isProductionRuntime({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isProductionRuntime({ NODE_ENV: "test" })).toBe(false);
    expect(isProductionRuntime({ NODE_ENV: "development" })).toBe(false);
    expect(isProductionRuntime({})).toBe(false);
  });

  test("testApiBlockedResponse returns 404 only in production", () => {
    const blockedVercel = testApiBlockedResponse({
      VERCEL_ENV: "production",
    });
    expect(blockedVercel).not.toBeNull();
    expect(blockedVercel?.status).toBe(404);

    const blockedNode = testApiBlockedResponse({ NODE_ENV: "production" });
    expect(blockedNode).not.toBeNull();
    expect(blockedNode?.status).toBe(404);

    expect(testApiBlockedResponse({ NODE_ENV: "test" })).toBeNull();
    expect(testApiBlockedResponse({ VERCEL_ENV: "preview" })).toBeNull();
    expect(testApiBlockedResponse({})).toBeNull();
  });

  test("both /api/test route modules call testApiBlockedResponse", () => {
    const rateLimit = readFileSync(
      join(process.cwd(), "src/app/api/test/rate-limit/route.ts"),
      "utf8",
    );
    const reset = readFileSync(
      join(process.cwd(), "src/app/api/test/reset-intents/route.ts"),
      "utf8",
    );
    const panelExt = readFileSync(
      join(process.cwd(), "src/app/api/test/panel-extended-until/route.ts"),
      "utf8",
    );
    const seedBuyout = readFileSync(
      join(process.cwd(), "src/app/api/test/seed-buyout/route.ts"),
      "utf8",
    );
    const seedOpen = readFileSync(
      join(process.cwd(), "src/app/api/test/seed-open-panels/route.ts"),
      "utf8",
    );
    const seedDemo = readFileSync(
      join(process.cwd(), "src/app/api/test/seed-demo/route.ts"),
      "utf8",
    );
    const magicLinkRate = readFileSync(
      join(process.cwd(), "src/app/api/test/magic-link-rate/route.ts"),
      "utf8",
    );
    const seatsOpen = readFileSync(
      join(process.cwd(), "src/app/api/test/seats-open/route.ts"),
      "utf8",
    );
    for (const src of [
      rateLimit,
      reset,
      panelExt,
      seedBuyout,
      seedOpen,
      seedDemo,
      magicLinkRate,
      seatsOpen,
    ]) {
      expect(src).toContain('from "@/lib/test-api-gate"');
      expect(src).toContain("testApiBlockedResponse()");
    }
  });

  test("test routes still work in CI Playwright (non-production)", async ({
    request,
  }) => {
    expect(process.env.VERCEL_ENV).not.toBe("production");
    expect(process.env.NODE_ENV).not.toBe("production");

    const reset = await request.post("/api/test/reset-intents");
    expect(reset.status()).toBe(200);
    expect(await reset.json()).toMatchObject({ ok: true });

    const rate = await request.post("/api/test/rate-limit", {
      data: { reset: true },
    });
    expect(rate.status()).toBe(200);
    expect(await rate.json()).toMatchObject({ ok: true });
  });
});
