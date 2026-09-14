import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  assertIntentOnly,
  depositUsdForMark,
  minIncrementUsd,
  nextStandingUsd,
  type IntentBid,
} from "../src/lib/intent";
import {
  FLOOR_USD,
  GOAL_USD,
  WRECK_REFUND_RULES,
  floorMarkerPercentOnGoalTrack,
  floorProgressPercent,
  goalProgressPercent,
  shortfallToFloorUsd,
  shortfallToGoalUsd,
} from "../src/lib/campaign";
import {
  listBidsForPanel,
  placeIntentBid,
  loadBoardIntentStats,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

test.describe("P2 intent math (no capture)", () => {
  test("increment uses $250 when larger than 10%", () => {
    expect(minIncrementUsd(1000)).toBe(250);
    expect(nextStandingUsd(1000)).toBe(1250);
  });

  test("increment uses 10% when larger than $250", () => {
    expect(minIncrementUsd(3000)).toBe(300);
    expect(nextStandingUsd(3000)).toBe(3300);
  });

  test("deposit is 20% of the mark, rounded up", () => {
    expect(depositUsdForMark(2500)).toBe(500);
    expect(depositUsdForMark(1001)).toBe(201);
  });

  test("intent bid shape rejects stripe capture fields", () => {
    const bid: IntentBid = {
      id: "bid_1",
      panelId: "hood",
      userId: "user_1",
      brandLabel: "Example Co",
      tradeLabel: "cold brew",
      standingUsd: 2500,
      depositUsd: depositUsdForMark(2500),
      status: "listed",
      createdAt: "2026-09-14T00:00:00.000Z",
    };
    assertIntentOnly(bid);
    expect(() =>
      assertIntentOnly({
        ...bid,
        stripePaymentMethodId: "pm_x",
      } as IntentBid),
    ).toThrow(/Stripe capture/);
  });

  test("postgres migration has no stripe capture columns", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0001_intent_bids.sql"),
      "utf8",
    );
    expect(sql).toContain("intent_bids");
    expect(sql).toContain("standing_usd");
    const tradeSql = readFileSync(
      join(process.cwd(), "drizzle/0002_intent_trade_label.sql"),
      "utf8",
    );
    expect(tradeSql).toContain("trade_label");
    expect(tradeSql).not.toMatch(/"(stripe|setup_intent|captured|payment_method)[^"]*"/i);
    expect(sql).not.toMatch(
      /"(stripe|setup_intent|captured|payment_method)[^"]*"/i,
    );
  });
});

test.describe("intent store memory ledger", () => {
  test.beforeEach(async () => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
  });

  test("places, outbids, and approves without capture fields", async () => {
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "user_a",
      brandLabel: "Alpha Brand",
      tradeLabel: "trail snacks",
    });
    expect(first.ok).toBeTruthy();
    if (!first.ok) return;
    expect(first.bid.depositUsd).toBe(depositUsdForMark(first.bid.standingUsd));
    assertIntentOnly(first.bid);

    const second = await placeIntentBid({
      panelId: "hood",
      userId: "user_b",
      brandLabel: "Beta Brand",
      tradeLabel: "trail tools",
      standingUsd: nextStandingUsd(first.bid.standingUsd),
    });
    expect(second.ok).toBeTruthy();
    if (!second.ok) return;

    const listed = await listBidsForPanel("hood");
    expect(listed.find((row) => row.id === first.bid.id)?.status).toBe(
      "outbid",
    );
    expect(listed.find((row) => row.id === second.bid.id)?.status).toBe(
      "listed",
    );

    const approved = await setIntentStatus(second.bid.id, "approved");
    expect(approved.ok).toBeTruthy();
    if (approved.ok) assertIntentOnly(approved.bid);
  });

  test("blocks a second brand from holding the same trade", async () => {
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "user_a",
      brandLabel: "Alpha Brand",
      tradeLabel: "Cold Brew",
    });
    expect(first.ok).toBeTruthy();

    const clash = await placeIntentBid({
      panelId: "front-fascia",
      userId: "user_b",
      brandLabel: "Beta Brand",
      tradeLabel: "cold brew",
    });
    expect(clash.ok).toBeFalsy();
    if (clash.ok) return;
    expect(clash.error).toMatch(/already held/i);
  });
});


  test("board intent stats start empty and soft-fail safe", async () => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    const empty = await loadBoardIntentStats();
    expect(empty.pledgedUsd).toBe(0);
    expect(empty.openSeats).toBe(12);
    expect(empty.seatedPanels).toBe(0);
  });

test.describe("honest shortfall math (no clock)", () => {
  test("shortfall and floor progress from pledged intents", () => {
    expect(shortfallToFloorUsd(0)).toBe(FLOOR_USD);
    expect(shortfallToGoalUsd(0)).toBe(GOAL_USD);
    expect(floorProgressPercent(0)).toBe(0);
    expect(shortfallToFloorUsd(FLOOR_USD)).toBe(0);
    expect(floorProgressPercent(FLOOR_USD)).toBe(100);
    expect(floorProgressPercent(FLOOR_USD * 2)).toBe(100);
    expect(shortfallToGoalUsd(GOAL_USD)).toBe(0);
  });

  test("visual vault markers sit on the buyout track", () => {
    expect(goalProgressPercent(0)).toBe(0);
    expect(goalProgressPercent(GOAL_USD / 2)).toBe(50);
    expect(goalProgressPercent(GOAL_USD)).toBe(100);
    expect(goalProgressPercent(GOAL_USD * 2)).toBe(100);
    expect(floorMarkerPercentOnGoalTrack()).toBe(
      Math.round((FLOOR_USD / GOAL_USD) * 1000) / 10,
    );
    expect(floorMarkerPercentOnGoalTrack()).toBeGreaterThan(0);
    expect(floorMarkerPercentOnGoalTrack()).toBeLessThan(100);
  });
});

test.describe("wreck + refund rules (no cash path)", () => {
  test("publishes the three RULES.md wreck outcomes", () => {
    expect(WRECK_REFUND_RULES).toHaveLength(3);
    expect(WRECK_REFUND_RULES.map((r) => r.id)).toEqual([
      "campaign-miss",
      "wrap-pro-rata",
      "immortal-fragment",
    ]);
    const joined = WRECK_REFUND_RULES.map((r) => r.body).join(" ");
    expect(joined).toMatch(/full refund/i);
    expect(joined).toMatch(/pro-rata/i);
    expect(joined).toMatch(/vault certificate/i);
    expect(joined).not.toMatch(/stripe/i);
    expect(joined).not.toMatch(/\blease\b/i);
  });
});
