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
import { parseStandingUsd } from "../src/lib/intent";
import {
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";

/**
 * Slice 12.6 — reject standing that is not an integer dollar.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.6: integer standing dollars only", () => {
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

  test("parseStandingUsd rejects fractional dollars", () => {
    expect(parseStandingUsd(2500)).toEqual({
      ok: true,
      standingUsd: 2500,
    });
    expect(parseStandingUsd("2500")).toEqual({
      ok: true,
      standingUsd: 2500,
    });
    expect(parseStandingUsd(2500.5).ok).toBe(false);
    expect(parseStandingUsd("2500.5").ok).toBe(false);
    expect(parseStandingUsd(-1).ok).toBe(false);
    expect(parseStandingUsd("").ok).toBe(true);
  });

  test("placeIntentBid rejects non-integer standing", async () => {
    const fractional = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_6_frac",
      brandLabel: "Frac Co",
      tradeLabel: "frac trade",
      standingUsd: 2500.5,
    });
    expect(fractional.ok).toBe(false);
    if (fractional.ok) return;
    expect(fractional.error).toMatch(/whole dollar/i);

    const whole = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_6_whole",
      brandLabel: "Whole Co",
      tradeLabel: "whole trade",
      standingUsd: 2500,
    });
    expect(whole.ok).toBe(true);
  });
});
