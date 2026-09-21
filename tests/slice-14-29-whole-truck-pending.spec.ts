import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import {
  WHOLE_TRUCK_PANEL_USD,
  WHOLE_TRUCK_PENDING_ERROR,
  wholeTruckStandingSum,
  listBidsForPanel,
  placeIntentBid,
  placeWholeTruckIntent,
  rejectWholeTruckIntent,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.29 — Whole-truck pending blocks new single-panel intents
 * on those seats until decided.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

test.describe("slice 14.29: whole-truck pending blocks single-panel", () => {
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
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(wholeTruckStandingSum()).toBe(GOAL_USD);
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("pending whole-truck blocks single-panel; reject clears the block", async () => {
    const whole = await placeWholeTruckIntent({
      userId: "wt1429-fleet",
      brandLabel: "Fleet Pending Co",
      tradeLabel: "fleet tools",
    });
    expect(whole.ok).toBe(true);
    if (!whole.ok) return;
    expect(whole.bids).toHaveLength(11);
    expect(whole.bids.every((bid) => bid.status === "listed")).toBe(true);

    const blocked = await placeIntentBid({
      panelId: "hood",
      userId: "wt1429-challenger",
      brandLabel: "Single Seat Co",
      tradeLabel: "seat snacks",
      standingUsd: 2500,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error).toBe(WHOLE_TRUCK_PENDING_ERROR);
    expect(blocked.error).toMatch(/whole-truck intent is pending/i);

    const hoodDuring = await listBidsForPanel("hood");
    expect(
      hoodDuring.some(
        (row) =>
          row.userId === "wt1429-challenger" && row.status === "listed",
      ),
    ).toBe(false);

    const anchor = whole.bids[0];
    expect(anchor).toBeTruthy();
    if (!anchor) return;

    const rejected = await rejectWholeTruckIntent({
      bidId: anchor.id,
      note: "Whole-truck art does not clear highway legibility.",
    });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.bids.every((bid) => bid.status === "rejected")).toBe(true);

    const after = await placeIntentBid({
      panelId: "hood",
      userId: "wt1429-challenger",
      brandLabel: "Single Seat Co",
      tradeLabel: "seat snacks",
      standingUsd: 2500,
    });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.bid.status).toBe("listed");
    expect(after.bid.standingUsd).toBe(2500);

    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toContain("WHOLE_TRUCK_PENDING_ERROR");
    expect(src).toContain("Slice 14.29");
    expect(src).toContain("panelBlockedByPendingWholeTruck");
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
