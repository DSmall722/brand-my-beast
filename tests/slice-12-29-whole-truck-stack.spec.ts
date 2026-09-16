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
  listBidsForPanel,
  loadBoardIntentStats,
  placeIntentBid,
  placeWholeTruckIntent,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 12.29 — whole-truck intent cannot stack on approved standing.
 * CLOSE_AT null. No Stripe. Intent only.
 */
test.describe("slice 12.29: whole-truck vs approved standing", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
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

  test("rejects whole-truck when a panel already has approved standing", async () => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();

    const prior = await placeIntentBid({
      panelId: "driver-door",
      userId: "seat_winner",
      brandLabel: "Door Co",
      tradeLabel: "door snacks",
      standingUsd: 1500,
    });
    expect(prior.ok).toBeTruthy();
    if (!prior.ok) return;
    const approved = await setIntentStatus(prior.bid.id, "approved");
    expect(approved.ok).toBeTruthy();

    const whole = await placeWholeTruckIntent({
      userId: "fleet_user",
      brandLabel: "Fleet Co",
      tradeLabel: "fleet tools",
    });
    expect(whole.ok).toBeFalsy();
    if (whole.ok) return;
    expect(whole.error).toMatch(/cannot stack|approved standing/i);

    const seat = (await listBidsForPanel("driver-door")).find(
      (bid) => bid.id === prior.bid.id,
    );
    expect(seat?.status).toBe("approved");
    expect((await loadBoardIntentStats()).pledgedUsd).toBe(1500);
  });
});
