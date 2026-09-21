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
  canFireFloorSave,
  isCampaignShortOfFloor,
} from "../src/lib/intent";
import {
  fireFloorSaveBid,
  loadBoardIntentStats,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 13.13 — floor-save cannot fire if pledged already >= $58,000.
 */
test.describe("slice 13.13: floor-save fire gate", () => {
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

  test("canFireFloorSave is false at or above $58,000", () => {
    expect(canFireFloorSave(0)).toBe(true);
    expect(canFireFloorSave(57_999)).toBe(true);
    expect(canFireFloorSave(58_000)).toBe(false);
    expect(canFireFloorSave(120_000)).toBe(false);
    expect(canFireFloorSave(58_000)).toBe(isCampaignShortOfFloor(58_000));
  });

  test("fireFloorSaveBid refuses when pledged >= $58,000", async () => {
    const save = await placeIntentBid({
      panelId: "rear-bumper",
      userId: "fs1313-saver",
      brandLabel: "FS Saver",
      tradeLabel: "fs vinyl",
      floorSaveUsd: 800,
    });
    expect(save.ok).toBe(true);
    if (!save.ok) return;

    const big = await placeIntentBid({
      panelId: "hood",
      userId: "fs1313-big",
      brandLabel: "FS Big",
      tradeLabel: "fs tools",
      standingUsd: 58_000,
    });
    expect(big.ok).toBe(true);
    if (!big.ok) return;

    const approved = await setIntentStatus(big.bid.id, "approved", {
      note: "floor cleared",
    });
    expect(approved.ok).toBe(true);

    const board = await loadBoardIntentStats();
    expect(board.pledgedUsd).toBeGreaterThanOrEqual(58_000);
    expect(canFireFloorSave(board.pledgedUsd)).toBe(false);

    const fired = await fireFloorSaveBid({ bidId: save.bid.id });
    expect(fired.ok).toBe(false);
    if (!fired.ok) {
      expect(fired.error).toMatch(/\$58,000/);
      expect(fired.error).toMatch(/cannot fire/i);
    }

    const blockedList = await placeIntentBid({
      panelId: "front-bumper",
      userId: "fs1313-late",
      brandLabel: "FS Late",
      tradeLabel: "fs late",
      floorSaveUsd: 600,
    });
    expect(blockedList.ok).toBe(false);
    if (!blockedList.ok) {
      expect(blockedList.error).toMatch(/\$58,000/);
    }
  });

  test("fireFloorSaveBid succeeds while pledged is under $58,000", async () => {
    const holder = await placeIntentBid({
      panelId: "tailgate",
      userId: "fs1313-hold",
      brandLabel: "FS Hold",
      tradeLabel: "fs1313 snacks",
      standingUsd: 2500,
    });
    expect(holder.ok).toBe(true);
    if (!holder.ok) return;

    const save = await placeIntentBid({
      panelId: "tailgate",
      userId: "fs1313-fire",
      brandLabel: "FS Fire",
      tradeLabel: "fs1313 paint",
      floorSaveUsd: 4000,
    });
    expect(save.ok).toBe(true);
    if (!save.ok) return;

    const board = await loadBoardIntentStats();
    expect(board.pledgedUsd).toBeLessThan(58_000);
    expect(canFireFloorSave(board.pledgedUsd)).toBe(true);

    const fired = await fireFloorSaveBid({ bidId: save.bid.id });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    expect(fired.bid.floorSaveUsd).toBeNull();
    expect(fired.bid.standingUsd).toBe(4000);
    expect(fired.bid.status).toBe("listed");
    expect(CLOSE_AT).toBeNull();
  });
});
