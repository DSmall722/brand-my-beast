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
  completeSameDayMockup,
  previewKeyFor,
} from "../src/lib/mockup";
import { checkHighwayLegibility } from "../src/lib/legibility";
import {
  ETCH_CONSTRAINTS,
  lintEtchArtNotes,
} from "../src/lib/etch-linter";
import {
  findAdjacentClashes,
  holdersOnAdjacentPanels,
  PANEL_ADJACENCY,
} from "../src/lib/panel-clash";
import {
  FINISH_CONDITIONS,
  finishConditionLabel,
  isFinishCondition,
} from "../src/lib/finish-conditions";
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

test.describe("same-day Imagine mockup scaffold (no billable API)", () => {
  test("preview keys are stable and completeSameDay marks ready", () => {
    const key = previewKeyFor({ panelId: "hood", brandLabel: "Signal Co" });
    expect(key).toMatch(/^imagine-[0-9a-f]+$/);
    expect(
      previewKeyFor({ panelId: "hood", brandLabel: "Signal Co" }),
    ).toBe(key);
    const mockup = completeSameDayMockup({
      id: "mock_1",
      bidId: "bid_1",
      panelId: "hood",
      brandLabel: "Signal Co",
      tradeLabel: "cold brew",
      finish: "wrap",
      previewKey: key,
      createdAt: "2026-09-14T00:00:00.000Z",
    });
    expect(mockup.status).toBe("ready");
    expect(mockup.readyAt).toBe("2026-09-14T00:00:00.000Z");
  });
});

test.describe("highway legibility checker (no capture)", () => {
  test("flags long wrap marks and etch-forbidden terms", () => {
    expect(
      checkHighwayLegibility({ brandLabel: "Short Co", finish: "wrap" })
        .severity,
    ).toBe("pass");
    expect(
      checkHighwayLegibility({
        brandLabel: "Twenty Character Brand!",
        finish: "wrap",
      }).severity,
    ).toBe("warn");
    expect(
      checkHighwayLegibility({
        brandLabel: "This Brand Name Is Way Too Long For Highway Speed Reads",
        finish: "wrap",
      }).severity,
    ).toBe("fail");
    const etch = checkHighwayLegibility({
      brandLabel: "Neon gradient mark",
      finish: "etch",
    });
    expect(etch.severity).toBe("fail");
    expect(etch.issues.some((i) => i.id === "etch-forbidden-terms")).toBe(
      true,
    );
  });
});

test.describe("etch constraint linter (no capture)", () => {
  test("publishes RULES.md checklist and fails forbidden art notes", () => {
    expect(ETCH_CONSTRAINTS.map((r) => r.id)).toEqual([
      "one-color",
      "min-stroke",
      "no-gradients",
      "no-fine-type",
    ]);
    expect(lintEtchArtNotes("").severity).toBe("pass");
    expect(lintEtchArtNotes("bold single-line sans").severity).toBe("pass");
    const bad = lintEtchArtNotes("full color gradient photo mark");
    expect(bad.severity).toBe("fail");
    expect(bad.issues.some((i) => i.id === "etch-forbidden-art")).toBe(true);
  });
});

test.describe("adjacent-panel clash detector (no capture)", () => {
  test("flags same brand and overlap on truck-face neighbors", () => {
    expect(PANEL_ADJACENCY.hood).toContain("front-fascia");
    const neighbors = holdersOnAdjacentPanels(
      "hood",
      new Map([
        [
          "front-fascia",
          {
            panelId: "front-fascia",
            panelName: "Front fascia",
            brandLabel: "Acme Steel",
            tradeLabel: "tools",
          },
        ],
        ["roof", null],
      ]),
    );
    expect(neighbors).toHaveLength(1);
    expect(
      findAdjacentClashes({
        panelId: "hood",
        brandLabel: "Acme Steel",
        neighbors,
      }),
    ).toEqual([
      expect.objectContaining({
        panelId: "front-fascia",
        reason: "same-brand",
      }),
    ]);
    expect(
      findAdjacentClashes({
        panelId: "hood",
        brandLabel: "Acme Tools Co",
        neighbors,
      })[0]?.reason,
    ).toBe("brand-overlap");
    expect(
      findAdjacentClashes({
        panelId: "hood",
        brandLabel: "Other Brand",
        neighbors,
      }),
    ).toEqual([]);
  });
});

test.describe("finish condition shaders (no capture)", () => {
  test("publishes day/night/wet/dirty condition ids", () => {
    expect(FINISH_CONDITIONS.map((c) => c.id)).toEqual([
      "day",
      "night",
      "wet",
      "dirty",
    ]);
    expect(isFinishCondition("night")).toBe(true);
    expect(isFinishCondition("fog")).toBe(false);
    expect(finishConditionLabel("wet")).toBe("Wet");
  });
});
