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
import { assertIntentOnly } from "../src/lib/intent";
import {
  countApprovedStandingForPanel,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 12.3 — unique partial index: one approved row per panelId.
 * App demotion (12.1) + DB index. CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.3: one approved per panel unique index", () => {
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

  test("migration creates unique partial index on approved panel_id", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0013_one_approved_per_panel.sql"),
      "utf8",
    );
    expect(sql).toMatch(/intent_bids_one_approved_per_panel_idx/);
    expect(sql).toMatch(/UNIQUE INDEX/i);
    expect(sql).toMatch(/panel_id/);
    expect(sql).toMatch(/WHERE\s+"status"\s*=\s*'approved'/i);
    expect(sql.toLowerCase()).not.toMatch(/payment_method/);
    expect(sql.toLowerCase()).not.toMatch(/setup_intent/);
    expect(sql).not.toMatch(/\bCLOSE_AT\b/);
  });

  test("schema declares the unique partial index", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/db/schema.ts"),
      "utf8",
    );
    expect(src).toMatch(/intent_bids_one_approved_per_panel_idx/);
    expect(src).toMatch(/uniqueIndex/);
    expect(src).toMatch(/status.*=.*'approved'/);
    expect(src).not.toMatch(/from ["']stripe["']/);
  });

  test("approve demotes prior approved so count stays one", async () => {
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_3_a",
      brandLabel: "Index A",
      tradeLabel: "index a trade",
      standingUsd: 2500,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const approvedA = await setIntentStatus(first.bid.id, "approved");
    expect(approvedA.ok).toBe(true);
    if (!approvedA.ok) return;
    assertIntentOnly(approvedA.bid);
    expect(await countApprovedStandingForPanel("hood")).toBe(1);

    const second = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_3_b",
      brandLabel: "Index B",
      tradeLabel: "index b trade",
      standingUsd: 3500,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const approvedB = await setIntentStatus(second.bid.id, "approved");
    expect(approvedB.ok).toBe(true);
    if (!approvedB.ok) return;
    expect(await countApprovedStandingForPanel("hood")).toBe(1);
  });
});
