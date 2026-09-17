import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import {
  ALL_PANELS_STANDING_ERROR,
  WHOLE_TRUCK_PANEL_USD,
  getIntentBidById,
  placeIntentBid,
  placeWholeTruckIntent,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 13.32 — same user cannot hold standing on all 12 panels unless
 * whole-truck path. CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

test.describe("slice 13.32: all-panels standing needs whole-truck", () => {
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
    expect(PANELS).toHaveLength(12);
    expect(WHOLE_TRUCK_PANEL_USD * PANELS.length).toBe(GOAL_USD);
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("single-panel path cannot list the 12th holding seat", async () => {
    const userId = "all12-place-user";
    const firstEleven = PANELS.slice(0, 11);
    for (const panel of firstEleven) {
      const placed = await placeIntentBid({
        panelId: panel.id,
        userId,
        brandLabel: "Scatter Co",
        tradeLabel: "scatter tools",
        standingUsd: panel.openingUsd,
      });
      expect(placed.ok).toBe(true);
      if (!placed.ok) return;
    }

    const twelfth = PANELS[11];
    expect(twelfth).toBeTruthy();
    if (!twelfth) return;
    const blocked = await placeIntentBid({
      panelId: twelfth.id,
      userId,
      brandLabel: "Scatter Co",
      tradeLabel: "scatter tools",
      standingUsd: twelfth.openingUsd,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error).toBe(ALL_PANELS_STANDING_ERROR);
  });

  test("whole-truck path may list all twelve", async () => {
    const whole = await placeWholeTruckIntent({
      userId: "all12-wt-user",
      brandLabel: "Fleet Cover Co",
      tradeLabel: "fleet cover tools",
    });
    expect(whole.ok).toBe(true);
    if (!whole.ok) return;
    expect(whole.bids).toHaveLength(12);
    expect(whole.bids.every((bid) => bid.status === "listed")).toBe(true);
    expect(
      whole.bids.every((bid) => bid.standingUsd === WHOLE_TRUCK_PANEL_USD),
    ).toBe(true);
  });

  test("approve of 12th single-panel seat is rejected; whole-truck ok", async () => {
    // Bypass place-gate with wholeTruckPath so we can prove the approve gate:
    // twelve opening-mark seats are not whole-truck coverage.
    const rejectUser = "all12-approve-reject";
    const listedIds: string[] = [];
    for (const panel of PANELS) {
      const placed = await placeIntentBid(
        {
          panelId: panel.id,
          userId: rejectUser,
          brandLabel: "Piecework Co",
          tradeLabel: "piecework tools",
          standingUsd: panel.openingUsd,
        },
        { wholeTruckPath: true },
      );
      expect(placed.ok).toBe(true);
      if (!placed.ok) return;
      listedIds.push(placed.bid.id);
    }

    for (const id of listedIds.slice(0, 11)) {
      expect((await setIntentStatus(id, "approved")).ok).toBe(true);
    }
    const twelfthId = listedIds[11];
    expect(twelfthId).toBeTruthy();
    if (!twelfthId) return;
    const blockedApprove = await setIntentStatus(twelfthId, "approved");
    expect(blockedApprove.ok).toBe(false);
    if (blockedApprove.ok) return;
    expect(blockedApprove.error).toBe(ALL_PANELS_STANDING_ERROR);
    expect((await getIntentBidById(twelfthId))?.status).toBe("listed");

    // Whole-truck: all twelve at buyout split may approve through 12.
    await resetIntentStoreForTests();
    const whole = await placeWholeTruckIntent({
      userId: "all12-wt-approve",
      brandLabel: "Fleet Approve Co",
      tradeLabel: "fleet approve tools",
    });
    expect(whole.ok).toBe(true);
    if (!whole.ok) return;
    for (const bid of whole.bids) {
      const approved = await setIntentStatus(bid.id, "approved");
      expect(approved.ok).toBe(true);
      if (!approved.ok) return;
    }
    expect(
      (
        await Promise.all(
          whole.bids.map(async (bid) => (await getIntentBidById(bid.id))?.status),
        )
      ).every((status) => status === "approved"),
    ).toBe(true);
  });
});
