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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import {
  STANDING_BRAND_LOCKED_ERROR,
  editPendingIntent,
  getIntentBidById,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";

/**
 * Slice 14.31 — Standing brand change after approve is forbidden.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

test.describe("slice 14.31: standing brand locked after approve", () => {
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
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("editPendingIntent refuses brand change on approved; brand stays put", async () => {
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "sb1431",
      brandLabel: "Standing Lock Co",
      tradeLabel: "lock snacks",
      standingUsd: 3100,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const approved = await setIntentStatus(listed.bid.id, "approved", {
      note: "Clears checklist.",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.bid.status).toBe("approved");
    expect(approved.bid.brandLabel).toBe("Standing Lock Co");

    const blocked = await editPendingIntent({
      bidId: approved.bid.id,
      userId: "sb1431",
      brandLabel: "Renamed After Approve",
      tradeLabel: "lock snacks",
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error).toBe(STANDING_BRAND_LOCKED_ERROR);
    expect(blocked.error).toMatch(/Standing brand change after approve/i);

    const live = await getIntentBidById(approved.bid.id);
    expect(live?.status).toBe("approved");
    expect(live?.brandLabel).toBe("Standing Lock Co");
    expect(live?.tradeLabel).toBe("lock snacks");

    // Pending edit still allowed before approve.
    const pending = await placeIntentBid({
      panelId: "tonneau",
      userId: "sb1431-pending",
      brandLabel: "Pending Brand",
      tradeLabel: "pending snacks",
      standingUsd: 900,
    });
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    const edited = await editPendingIntent({
      bidId: pending.bid.id,
      userId: "sb1431-pending",
      brandLabel: "Pending Brand Renamed",
      tradeLabel: "pending tools",
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.bid.brandLabel).toBe("Pending Brand Renamed");

    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toContain("STANDING_BRAND_LOCKED_ERROR");
    expect(src).toContain("Slice 14.31");
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
