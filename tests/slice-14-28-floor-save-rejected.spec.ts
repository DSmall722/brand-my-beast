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
  FLOOR_SAVE_REJECTED_ERROR,
  fireFloorSaveBid,
  getIntentBidById,
  listBidsForPanel,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.28 — Floor-save does not raise a rejected mark.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

test.describe("slice 14.28: floor-save does not raise a rejected mark", () => {
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
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("fireFloorSaveBid refuses rejected floor-save; mark stays rejected", async () => {
    const save = await placeIntentBid({
      panelId: "rear-bumper",
      userId: "fs1428-saver",
      brandLabel: "FS Reject",
      tradeLabel: "fs vinyl",
      floorSaveUsd: 900,
    });
    expect(save.ok).toBe(true);
    if (!save.ok) return;
    expect(save.bid.floorSaveUsd).toBe(900);
    expect(save.bid.status).toBe("listed");

    const rejected = await setIntentStatus(save.bid.id, "rejected", {
      note: "Hard-reject for 14.28 gate.",
      expectedUpdatedAt: save.bid.updatedAt,
    });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.bid.status).toBe("rejected");
    expect(rejected.bid.floorSaveUsd).toBe(900);

    const fired = await fireFloorSaveBid({ bidId: save.bid.id });
    expect(fired.ok).toBe(false);
    if (fired.ok) return;
    expect(fired.error).toBe(FLOOR_SAVE_REJECTED_ERROR);
    expect(fired.error).toMatch(/rejected mark/i);

    const live = await getIntentBidById(save.bid.id);
    expect(live?.status).toBe("rejected");
    expect(live?.floorSaveUsd).toBe(900);
    expect(live?.standingUsd).toBe(900);

    const panel = await listBidsForPanel("rear-bumper");
    const listedStanding = panel.filter(
      (row) =>
        row.status === "listed" &&
        row.userId === "fs1428-saver" &&
        row.floorSaveUsd == null,
    );
    expect(listedStanding).toHaveLength(0);

    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toContain("FLOOR_SAVE_REJECTED_ERROR");
    expect(src).toContain("Slice 14.28");
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
