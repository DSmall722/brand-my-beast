import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PROXY_MAX_CAP_USD,
  formatUsd,
} from "../src/lib/campaign";
import { parseProxyMaxUsd } from "../src/lib/intent";
import { placeIntentBid, resetIntentStoreForTests } from "../src/lib/intent-store";

/**
 * Slice 13.12 — proxy max hard cap = buyout $120,000 (published in CAMPAIGN.md).
 */
test.describe("slice 13.12: proxy max hard cap", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(PROXY_MAX_CAP_USD).toBe(GOAL_USD);
    expect(PROXY_MAX_CAP_USD).toBe(120_000);
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

  test("CAMPAIGN.md publishes the $120,000 proxy cap", () => {
    const text = readFileSync(join(process.cwd(), "CAMPAIGN.md"), "utf8");
    expect(text).toMatch(/13\.12/);
    expect(text).toContain("$120,000");
    expect(text).toMatch(/[Pp]roxy max/);
    expect(text).toContain("$58,000");
  });

  test("parseProxyMaxUsd rejects above buyout cap", () => {
    expect(parseProxyMaxUsd(120_000, 2500)).toEqual({
      ok: true,
      proxyMaxUsd: 120_000,
    });
    const over = parseProxyMaxUsd(120_001, 2500);
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.error).toMatch(/120,000/);
      expect(over.error).toMatch(/buyout cap/i);
    }
  });

  test("placeIntentBid rejects proxy above cap", async () => {
    const result = await placeIntentBid({
      panelId: "hood",
      userId: "proxy-cap-over",
      brandLabel: "Cap Over",
      tradeLabel: "cap tools",
      standingUsd: 2500,
      proxyMaxUsd: 120_001,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/120,000/);
    }

    const ok = await placeIntentBid({
      panelId: "hood",
      userId: "proxy-cap-ok",
      brandLabel: "Cap Ok",
      tradeLabel: "cap snacks",
      standingUsd: 2500,
      proxyMaxUsd: 120_000,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.bid.proxyMaxUsd).toBe(120_000);
    }
  });
});
