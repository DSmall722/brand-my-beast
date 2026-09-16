import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { assertIntentOnly, depositUsdForMark } from "../src/lib/intent";
import {
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";

/**
 * Slice 12.5 — depositUsd always round(standing * 0.20) in one helper.
 * Playwright lock. CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.5: depositUsd round helper", () => {
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
    expect(DEPOSIT_PERCENT).toBe(20);
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

  test("depositUsdForMark is round(standing * 0.20) — not ceil", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/intent.ts"), "utf8");
    expect(src).toMatch(
      /return Math\.round\(markUsd \* \(DEPOSIT_PERCENT \/ 100\)\)/,
    );
    expect(src).not.toMatch(/Math\.ceil\(\(markUsd \* DEPOSIT_PERCENT\)/);
    expect(depositUsdForMark(2500)).toBe(500);
    expect(depositUsdForMark(1001)).toBe(Math.round(1001 * 0.2));
    expect(depositUsdForMark(1001)).toBe(200);
    expect(depositUsdForMark(1000)).toBe(200);
  });

  test("intent-store only computes deposit via depositUsdForMark", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toMatch(/depositUsdForMark\(/);
    expect(src).not.toMatch(/Math\.(ceil|round|floor)\([^)]*0\.2/);
    expect(src).not.toMatch(/standingUsd\s*\*\s*0\.2/);
    expect(src).not.toMatch(/DEPOSIT_PERCENT/);
  });

  test("placeIntentBid depositUsd matches the helper", async () => {
    const standingUsd = 2501;
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_5_dep",
      brandLabel: "Deposit Co",
      tradeLabel: "deposit trade",
      standingUsd,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    assertIntentOnly(placed.bid);
    expect(placed.bid.depositUsd).toBe(depositUsdForMark(standingUsd));
    expect(placed.bid.depositUsd).toBe(Math.round(standingUsd * 0.2));
  });
});
