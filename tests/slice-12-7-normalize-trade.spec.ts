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
import { normalizeTradeLabel } from "../src/lib/intent";
import {
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";

/**
 * Slice 12.7 — normalize trade strings before exclusivity check.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.7: normalize trade before exclusivity", () => {
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

  test("normalizeTradeLabel trims, lowercases, collapses spaces", () => {
    expect(normalizeTradeLabel("  Trail   Snacks  ")).toBe("trail snacks");
    expect(normalizeTradeLabel("TRAIL SNACKS")).toBe("trail snacks");
    expect(normalizeTradeLabel("trail snacks")).toBe("trail snacks");
    expect(normalizeTradeLabel("\tCold\nBrew\t")).toBe("cold brew");
    expect(normalizeTradeLabel("   ")).toBe("");
  });

  test("intent-store exclusivity compares via normalizeTradeLabel", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toMatch(/const tradeKey = normalizeTradeLabel\(tradeLabel\)/);
    expect(src).toMatch(
      /normalizeTradeLabel\(bid\.tradeLabel\) === tradeKey/,
    );
    expect(src).toMatch(
      /normalizeTradeLabel\(row\.tradeLabel\) === tradeKey/,
    );
  });

  test("whitespace and case variants collide across panels", async () => {
    const holder = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_7_hold",
      brandLabel: "Holder Co",
      tradeLabel: "Trail Snacks",
      standingUsd: 2500,
    });
    expect(holder.ok).toBe(true);
    if (!holder.ok) return;

    const spaced = await placeIntentBid({
      panelId: "tonneau",
      userId: "user_12_7_space",
      brandLabel: "Space Co",
      tradeLabel: "  trail   snacks  ",
      standingUsd: 800,
    });
    expect(spaced.ok).toBe(false);
    if (spaced.ok) return;
    expect(spaced.error).toMatch(/one brand per trade/i);

    const cased = await placeIntentBid({
      panelId: "front-fascia",
      userId: "user_12_7_case",
      brandLabel: "Case Co",
      tradeLabel: "TRAIL SNACKS",
      standingUsd: 800,
    });
    expect(cased.ok).toBe(false);
    if (cased.ok) return;
    expect(cased.error).toMatch(/one brand per trade/i);

    const other = await placeIntentBid({
      panelId: "tonneau",
      userId: "user_12_7_other",
      brandLabel: "Other Co",
      tradeLabel: "trail tools",
      standingUsd: 800,
    });
    expect(other.ok).toBe(true);
  });
});
