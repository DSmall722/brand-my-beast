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
  CLOSE_AT,
  PANELS,
  TRUCK_EXISTS,
  WRECK_REFUND_RULES,
  floorMarkerPercentOnGoalTrack,
  floorProgressPercent,
  goalProgressPercent,
  isEtchUnlocked,
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
  COMBO_LOT_LEAD,
  comboLotCopyIsSafe,
  comboLotFor,
} from "../src/lib/combo-lots";
import {
  FINISH_CONDITIONS,
  finishConditionLabel,
  isFinishCondition,
} from "../src/lib/finish-conditions";
import {
  assertNoteRequiredForReject,
  artworkChecklistForPanel,
} from "../src/lib/artwork-approval";
import {
  assertTradeAllowed,
  findBannedTradeReason,
} from "../src/lib/banned-trades";
import {
  HOMETOWN_LANES,
  hometownLaneCopyIsSafe,
  hometownLaneLabels,
} from "../src/lib/hometown-lane";
import { isShopPartnerEmail } from "../src/lib/auth/shop-partner";
import { isOperatorEmail } from "../src/lib/auth/operator";
import {
  assertOperatorCampaignLocks,
  operatorCampaignLockLabels,
  operatorCampaignLocks,
} from "../src/lib/operator-campaign-locks";
import {
  STAINLESS_COMPOSITOR_LEAD,
  compositorFinishLabel,
  stainlessCompositorCopyIsSafe,
} from "../src/lib/stainless-compositor";
import {
  etchControlsEnabled,
  etchLockCopy,
} from "../src/lib/etch-lock";
import {
  WINNER_PORTAL_FACTS,
  winnerPortalFactsVisible,
  winnerSeatsFor,
} from "../src/lib/winner-portal";
import {
  CABIN_PLAQUE_LEAD,
  assertPlaqueIsNotABid,
  type CabinPlaqueLine,
} from "../src/lib/cabin-plaque";
import {
  reserveCabinPlaqueName,
  resetCabinPlaqueStoreForTests,
} from "../src/lib/cabin-plaque-store";
import {
  CONTENT_RIGHT_OPTIONS,
  contentRightsCopyIsSafe,
  parseContentRightIds,
} from "../src/lib/content-rights";
import {
  getContentRightsForUser,
  resetContentRightsStoreForTests,
  saveContentRightsForUser,
} from "../src/lib/content-rights-store";
import {
  CIRCUIT_STORY_CORRIDORS,
  CIRCUIT_STORY_LEAD,
  circuitStoryCopyIsSafe,
} from "../src/lib/circuit-story";
import {
  resetCircuitStoryStoreForTests,
  submitCircuitStoryRequest,
} from "../src/lib/circuit-story-store";
import {
  SIGHTING_LEAD,
  sightingCopyIsSafe,
} from "../src/lib/sighting";
import {
  VAULT_CERTIFICATE_LEAD,
  vaultCertificateCopyIsSafe,
} from "../src/lib/vault-certificate";
import {
  RETIRED_VINYL_LEAD,
  retiredVinylCopyIsSafe,
} from "../src/lib/retired-vinyl";
import {
  SEASON_TWO_LEAD,
  seasonTwoCopyIsSafe,
} from "../src/lib/season-two";
import {
  DIRTY_CLEAN_PAIR_LEAD,
  dirtyCleanPairCopyIsSafe,
} from "../src/lib/dirty-clean-pair";
import {
  RAIN_NIGHT_LIGHTING_LEAD,
  rainNightLightingCopyIsSafe,
} from "../src/lib/rain-night-lighting";
import {
  TRUCK_ORDER_TRACKER_LEAD,
  truckOrderTrackerCopyIsSafe,
} from "../src/lib/truck-order-tracker";
import {
  WEEKLY_MILEAGE_LEDGER_LEAD,
  weeklyMileageLedgerCopyIsSafe,
} from "../src/lib/weekly-mileage-ledger";
import {
  LANDMARK_PROOF_LOG_LEAD,
  landmarkProofLogCopyIsSafe,
} from "../src/lib/landmark-proof-log";
import {
  CITY_TIME_HEATMAP_LEAD,
  cityTimeHeatmapCopyIsSafe,
} from "../src/lib/city-time-heatmap";
import {
  QR_NFC_SCAN_COUNTER_LEAD,
  qrNfcScanCounterCopyIsSafe,
} from "../src/lib/qr-nfc-scan-counter";
import {
  CITY_PING_WINNER_LEAD,
  cityPingWinnerCopyIsSafe,
} from "../src/lib/city-ping-winner";
import {
  CHARGE_STOP_SLOTS_LEAD,
  chargeStopSlotsCopyIsSafe,
} from "../src/lib/charge-stop-slots";
import {
  ROUTE_DETOUR_BUYOUT_LEAD,
  routeDetourBuyoutCopyIsSafe,
} from "../src/lib/route-detour-buyout";
import {
  CLEMSON_SATURDAY_LOCK_LEAD,
  clemsonSaturdayLockCopyIsSafe,
} from "../src/lib/clemson-saturday-lock";
import {
  SIGHTING_BOUNTY_CARDS_LEAD,
  sightingBountyCardsCopyIsSafe,
} from "../src/lib/sighting-bounty-cards";

import {
  EVENT_REQUEST_KINDS,
  EVENT_REQUEST_LEAD,
  eventRequestCopyIsSafe,
} from "../src/lib/event-request";
import {
  resetEventRequestStoreForTests,
  submitEventRequest,
} from "../src/lib/event-request-store";
import {
  resetSightingStoreForTests,
  submitSighting,
} from "../src/lib/sighting-store";
import {
  intentStoreUsesMemory,
  listBidsForPanel,
  listBidsForUser,
  listApprovedBids,
  listApprovedBidsForUser,
  listDecidedBids,
  placeIntentBid,
  loadBoardIntentStats,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  getApprovalNote,
  resetApprovalNoteStoreForTests,
  saveApprovalNote,
} from "../src/lib/approval-note-store";

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

  test("drizzle schema declares intent indexes and no stripe columns", () => {
    const schema = readFileSync(
      join(process.cwd(), "src/lib/db/schema.ts"),
      "utf8",
    );
    expect(schema).toContain("intent_bids");
    expect(schema).toContain("intent_bids_panel_id_idx");
    expect(schema).toContain("intent_bids_status_idx");
    expect(schema).toContain("intent_bids_trade_label_idx");
    expect(schema).not.toMatch(
      /"(stripe|setup_intent|captured|payment_method)[^"]*"/i,
    );
  });

  test("Production never uses the memory intent store", () => {
    expect(
      intentStoreUsesMemory({
        VERCEL_ENV: "production",
        INTENT_MODE: "memory",
      }),
    ).toBe(false);
    expect(
      intentStoreUsesMemory({
        VERCEL_ENV: "production",
        DATABASE_URL: "postgres://example",
      }),
    ).toBe(false);
    expect(intentStoreUsesMemory({ INTENT_MODE: "memory" })).toBe(true);
    expect(intentStoreUsesMemory({})).toBe(true);
    expect(
      intentStoreUsesMemory({ DATABASE_URL: "postgres://example" }),
    ).toBe(false);
  });
});

test.describe("intent store memory ledger", () => {
  test.beforeEach(async () => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
  });

  test("slice 1.2: rejects mark below panel opening", async () => {
    const low = await placeIntentBid({
      panelId: "hood",
      userId: "user_low",
      brandLabel: "Low Bid Co",
      tradeLabel: "trail mix",
      standingUsd: 2499,
    });
    expect(low.ok).toBeFalsy();
    if (low.ok) return;
    expect(low.error).toMatch(/at least 2500/i);
  });

  test("slice 1.2: signed-in user keeps one listed intent per panel", async () => {
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "user_one",
      brandLabel: "One Brand",
      tradeLabel: "trail snacks",
      standingUsd: 2500,
    });
    expect(first.ok).toBeTruthy();
    if (!first.ok) return;

    const second = await placeIntentBid({
      panelId: "hood",
      userId: "user_one",
      brandLabel: "One Brand",
      tradeLabel: "trail snacks",
      standingUsd: 2500,
    });
    expect(second.ok).toBeTruthy();
    if (!second.ok) return;

    const listed = await listBidsForPanel("hood");
    const active = listed.filter(
      (bid) => bid.userId === "user_one" && bid.status === "listed",
    );
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(second.bid.id);
    expect(listed.find((bid) => bid.id === first.bid.id)?.status).toBe(
      "withdrawn",
    );
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

  test("slice 1.4: one brand per trade; challenger fights the same panel only", async () => {
    const holder = await placeIntentBid({
      panelId: "hood",
      userId: "holder_a",
      brandLabel: "Holder Brand",
      tradeLabel: "Trail Snacks",
      standingUsd: 2500,
    });
    expect(holder.ok).toBeTruthy();
    if (!holder.ok) return;

    const elsewhere = await placeIntentBid({
      panelId: "tonneau",
      userId: "challenger_b",
      brandLabel: "Challenger Brand",
      tradeLabel: "trail snacks",
      standingUsd: 800,
    });
    expect(elsewhere.ok).toBeFalsy();
    if (elsewhere.ok) return;
    expect(elsewhere.error).toMatch(/one brand per trade/i);

    const samePanel = await placeIntentBid({
      panelId: "hood",
      userId: "challenger_b",
      brandLabel: "Challenger Brand",
      tradeLabel: "trail tools",
      standingUsd: nextStandingUsd(holder.bid.standingUsd),
    });
    expect(samePanel.ok).toBeTruthy();
    if (!samePanel.ok) return;

    const listed = await listBidsForPanel("hood");
    expect(listed.find((row) => row.id === holder.bid.id)?.status).toBe(
      "outbid",
    );
    expect(listed.find((row) => row.id === samePanel.bid.id)?.status).toBe(
      "listed",
    );
  });

  test("slice 1.5: rejects mark below standing + max($250, 10%)", async () => {
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "inc_holder",
      brandLabel: "Increment Hold",
      tradeLabel: "increment snacks",
      standingUsd: 2500,
    });
    expect(first.ok).toBeTruthy();
    if (!first.ok) return;
    expect(nextStandingUsd(2500)).toBe(2750);

    const tooLow = await placeIntentBid({
      panelId: "hood",
      userId: "inc_low",
      brandLabel: "Increment Low",
      tradeLabel: "increment tools",
      standingUsd: 2749,
    });
    expect(tooLow.ok).toBeFalsy();
    if (tooLow.ok) return;
    expect(tooLow.error).toMatch(/at least 2750/i);

    const exact = await placeIntentBid({
      panelId: "hood",
      userId: "inc_ok",
      brandLabel: "Increment Ok",
      tradeLabel: "increment vinyl",
      standingUsd: 2750,
    });
    expect(exact.ok).toBeTruthy();
  });

  test("slice 1.5: 10% floor applies when larger than $250", async () => {
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "pct_holder",
      brandLabel: "Percent Hold",
      tradeLabel: "percent snacks",
      standingUsd: 3000,
    });
    expect(first.ok).toBeTruthy();
    if (!first.ok) return;
    expect(nextStandingUsd(3000)).toBe(3300);

    const tooLow = await placeIntentBid({
      panelId: "hood",
      userId: "pct_low",
      brandLabel: "Percent Low",
      tradeLabel: "percent tools",
      standingUsd: 3299,
    });
    expect(tooLow.ok).toBeFalsy();
    if (tooLow.ok) return;
    expect(tooLow.error).toMatch(/at least 3300/i);

    const exact = await placeIntentBid({
      panelId: "hood",
      userId: "pct_ok",
      brandLabel: "Percent Ok",
      tradeLabel: "percent vinyl",
      standingUsd: 3300,
    });
    expect(exact.ok).toBeTruthy();
  });

  test("slice 1.6: outbid flips previous listed mark to outbid", async () => {
    const holder = await placeIntentBid({
      panelId: "hood",
      userId: "outbid_holder",
      brandLabel: "Outbid Hold",
      tradeLabel: "outbid snacks",
      standingUsd: 2500,
    });
    expect(holder.ok).toBeTruthy();
    if (!holder.ok) return;
    expect(holder.bid.status).toBe("listed");

    const challenger = await placeIntentBid({
      panelId: "hood",
      userId: "outbid_challenger",
      brandLabel: "Outbid Fight",
      tradeLabel: "outbid tools",
      standingUsd: nextStandingUsd(holder.bid.standingUsd),
    });
    expect(challenger.ok).toBeTruthy();
    if (!challenger.ok) return;
    expect(challenger.bid.status).toBe("listed");

    const listed = await listBidsForPanel("hood");
    expect(listed.find((row) => row.id === holder.bid.id)?.status).toBe(
      "outbid",
    );
    expect(listed.find((row) => row.id === challenger.bid.id)?.status).toBe(
      "listed",
    );
    assertIntentOnly(challenger.bid);
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
  test("slice 3.2: etch controls stay off under buyout", () => {
    const hood = PANELS.find((p) => p.id === "hood");
    expect(hood).toBeTruthy();
    if (!hood) return;
    expect(isEtchUnlocked(0)).toBe(false);
    expect(isEtchUnlocked(119_999)).toBe(false);
    expect(isEtchUnlocked(120_000)).toBe(true);
    expect(etchControlsEnabled(hood, 0)).toBe(false);
    expect(etchControlsEnabled(hood, 119_999)).toBe(false);
    expect(etchControlsEnabled(hood, 120_000)).toBe(true);
    expect(etchLockCopy(0)).toContain("locked while raised is under $120,000");
    expect(etchLockCopy(120_000)).toContain("unlocked");
    const roof = PANELS.find((p) => p.id === "roof");
    expect(roof).toBeTruthy();
    if (!roof) return;
    expect(etchControlsEnabled(roof, 120_000)).toBe(false);
  });

  test("slice 3.1: stainless compositor lead is preview-only", () => {
    expect(stainlessCompositorCopyIsSafe()).toBe(true);
    expect(STAINLESS_COMPOSITOR_LEAD.toLowerCase()).toContain("preview only");
    expect(STAINLESS_COMPOSITOR_LEAD).toContain("$120,000");
    expect(STAINLESS_COMPOSITOR_LEAD.toLowerCase()).not.toMatch(/\blease\b/);
    expect(STAINLESS_COMPOSITOR_LEAD).not.toContain("CLOSE_AT");
    expect(compositorFinishLabel("wrap", true)).toContain("Wrap");
    expect(compositorFinishLabel("etch", true)).toContain("$120,000");
    expect(compositorFinishLabel("wrap", false)).toBe("Wrap only");
  });

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

test.describe("artwork approval thread (no capture)", () => {
  test("slice 2.2: approve lists the intent; reject requires a note", async () => {
    expect(assertNoteRequiredForReject({ decision: "approved", note: "" }).ok).toBe(
      true,
    );
    expect(
      assertNoteRequiredForReject({ decision: "rejected", note: "" }).ok,
    ).toBe(false);
    expect(
      assertNoteRequiredForReject({ decision: "rejected", note: "no" }).ok,
    ).toBe(false);
    expect(
      assertNoteRequiredForReject({
        decision: "rejected",
        note: "Cannot pass a grocery lot",
      }).ok,
    ).toBe(true);
    expect(artworkChecklistForPanel(true).some((i) => i.id === "etch-one-color")).toBe(
      true,
    );
    expect(
      artworkChecklistForPanel(false).some((i) => i.id === "etch-one-color"),
    ).toBe(false);

    await resetIntentStoreForTests();
    const approve = await placeIntentBid({
      panelId: "hood",
      userId: "user_art_approve",
      brandLabel: "Approve Co",
      tradeLabel: "fasteners",
    });
    expect(approve.ok).toBe(true);
    if (!approve.ok) return;
    const approved = await setIntentStatus(approve.bid.id, "approved");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.bid.status).toBe("approved");
    expect((await listDecidedBids()).map((b) => b.id)).toContain(approve.bid.id);

    const reject = await placeIntentBid({
      panelId: "tonneau",
      userId: "user_art_reject",
      brandLabel: "Reject Co",
      tradeLabel: "tools",
      standingUsd: 800,
    });
    expect(reject.ok).toBe(true);
    if (!reject.ok) return;
    const rejected = await setIntentStatus(reject.bid.id, "rejected");
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.bid.status).toBe("rejected");
    expect((await listDecidedBids()).map((b) => b.id)).toContain(reject.bid.id);
  });

  test("slice 2.4: approval notes feed the /account thread", async () => {
    await resetIntentStoreForTests();
    await resetApprovalNoteStoreForTests();
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_thread",
      brandLabel: "Thread Co",
      tradeLabel: "snacks",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const approved = await setIntentStatus(placed.bid.id, "approved");
    expect(approved.ok).toBe(true);
    await saveApprovalNote({
      bidId: placed.bid.id,
      decision: "approved",
      note: "Clears school and grocery lot",
    });
    const note = await getApprovalNote(placed.bid.id);
    expect(note?.decision).toBe("approved");
    expect(note?.note).toMatch(/grocery/i);
    const byUser = await listBidsForUser("user_thread");
    expect(byUser.some((b) => b.status === "approved")).toBe(true);
  });

  test("slice 2.3: banned trades hard-reject (porn, hate, scams, school-lot)", async () => {
    expect(findBannedTradeReason("Ok Co", "fasteners")).toBeNull();
    expect(findBannedTradeReason("X", "porn merch")).toBe("porn");
    expect(findBannedTradeReason("Hate Brand", "tees")).toBe("hate");
    expect(findBannedTradeReason("Ok", "phishing kits")).toBe("scam");
    expect(findBannedTradeReason("Ok", "strip club ads")).toBe("school_lot");

    expect(
      assertTradeAllowed({ brandLabel: "Clean Co", tradeLabel: "tools" }).ok,
    ).toBe(true);
    const porn = assertTradeAllowed({
      brandLabel: "Bad Co",
      tradeLabel: "porn merch",
    });
    expect(porn.ok).toBe(false);
    if (porn.ok) return;
    expect(porn.reason).toBe("porn");
    expect(porn.error).toMatch(/Hard-reject/i);

    await resetIntentStoreForTests();
    const banned = await placeIntentBid({
      panelId: "hood",
      userId: "user_banned_trade",
      brandLabel: "Scam Co",
      tradeLabel: "scam leads",
    });
    expect(banned.ok).toBe(false);
    if (banned.ok) return;
    expect(banned.error).toMatch(/Hard-reject/i);
    expect(banned.error).toMatch(/scam/i);

    const school = await placeIntentBid({
      panelId: "hood",
      userId: "user_school_lot",
      brandLabel: "Lot Fail",
      tradeLabel: "gore stickers",
    });
    expect(school.ok).toBe(false);
    if (school.ok) return;
    expect(school.error).toMatch(/school-lot/i);

    const clean = await placeIntentBid({
      panelId: "hood",
      userId: "user_clean_trade",
      brandLabel: "Clean Co",
      tradeLabel: "tools",
    });
    expect(clean.ok).toBe(true);
  });
});

test.describe("hometown lane tags (no capture)", () => {
  test("publishes four soft circuit labels without banned dumps", () => {
    expect(HOMETOWN_LANES.map((lane) => lane.id)).toEqual([
      "sc",
      "charlotte",
      "atlanta",
      "panhandle",
    ]);
    expect(hometownLaneLabels()).toEqual([
      "SC",
      "Charlotte",
      "Atlanta",
      "Panhandle",
    ]);
    expect(hometownLaneCopyIsSafe()).toBe(true);
    const blob = hometownLaneLabels().join(" ");
    expect(blob).not.toContain("South Carolina home loop");
    expect(blob).not.toContain("Florida panhandle");
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(TRUCK_EXISTS).toBe(false);
    expect(CLOSE_AT).toBeNull();
  });
});

test.describe("wrap-shop partner portal (no capture)", () => {
  test("gates shop email and lists approved bids only", async () => {
    expect(isShopPartnerEmail("shop@example.com")).toBe(true);
    expect(isShopPartnerEmail("operator@example.com")).toBe(false);
    expect(isShopPartnerEmail("bidder@example.com")).toBe(false);

    await resetIntentStoreForTests();
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_shop_1",
      brandLabel: "Wrap Co",
      tradeLabel: "vinyl",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect((await listApprovedBids()).length).toBe(0);
    await setIntentStatus(placed.bid.id, "approved");
    const approved = await listApprovedBids();
    expect(approved.map((b) => b.id)).toContain(placed.bid.id);
    expect(approved.every((b) => b.status === "approved")).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("operator allow-list (no capture)", () => {
  test("slice 2.5: operator campaign locks stay read-only constants", () => {
    expect(assertOperatorCampaignLocks()).toBe(true);
    const locks = operatorCampaignLocks();
    expect(locks.editable).toBe(false);
    expect(locks.floorUsd).toBe(58_000);
    expect(locks.goalUsd).toBe(120_000);
    expect(locks.closeAt).toBeNull();
    expect(operatorCampaignLockLabels()).toEqual({
      floor: "$58,000",
      goal: "$120,000",
      close: "unset",
    });
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
  });

  test("slice 2.1: OPERATOR_EMAILS allow-list gates /operator in live mode", () => {
    expect(
      isOperatorEmail("ops@brandmybeast.com", {
        AUTH_MODE: "live",
        OPERATOR_EMAILS: "ops@brandmybeast.com,crew@brandmybeast.com",
      }),
    ).toBe(true);
    expect(
      isOperatorEmail("crew@brandmybeast.com", {
        AUTH_MODE: "live",
        OPERATOR_EMAILS: "ops@brandmybeast.com,crew@brandmybeast.com",
      }),
    ).toBe(true);
    expect(
      isOperatorEmail("bidder@example.com", {
        AUTH_MODE: "live",
        OPERATOR_EMAILS: "ops@brandmybeast.com",
      }),
    ).toBe(false);
    expect(
      isOperatorEmail("stranger@brandmybeast.com", {
        AUTH_MODE: "live",
        OPERATOR_EMAILS: "ops@brandmybeast.com",
      }),
    ).toBe(false);
    expect(
      isOperatorEmail("bidder@example.com", {
        AUTH_MODE: "test",
        OPERATOR_EMAILS: "",
      }),
    ).toBe(true);
    expect(isOperatorEmail(null, { AUTH_MODE: "live", OPERATOR_EMAILS: "ops@brandmybeast.com" })).toBe(
      false,
    );
  });
});

test.describe("winner portal (no capture)", () => {
  test("lists only this user's approved seats", async () => {
    expect(WINNER_PORTAL_FACTS.some((fact) => fact.id === "wrap-term")).toBe(
      true,
    );
    expect(WINNER_PORTAL_FACTS.some((fact) => fact.id === "etch-lock")).toBe(
      true,
    );
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "vault-certificate"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "retired-vinyl"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "season-two"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "rain-night-lighting"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "truck-order-tracker"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "weekly-mileage-ledger"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "landmark-proof-log"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "city-time-heatmap"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "qr-nfc-scan-counter"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "city-ping-winner"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "charge-stop-slots"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "route-detour-buyout"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "clemson-saturday-lock"),
    ).toBe(true);
    expect(
      WINNER_PORTAL_FACTS.some((fact) => fact.id === "sighting-bounty-cards"),
    ).toBe(true);
    const visible = winnerPortalFactsVisible(false);
    expect(visible.some((fact) => fact.id === "wrap-term")).toBe(true);
    expect(visible.some((fact) => fact.id === "etch-lock")).toBe(true);
    expect(visible.some((fact) => fact.id === "vault-certificate")).toBe(false);
    expect(visible.some((fact) => fact.id === "sighting-bounty-cards")).toBe(
      false,
    );
    expect(winnerPortalFactsVisible(true).length).toBe(WINNER_PORTAL_FACTS.length);

    const blob = WINNER_PORTAL_FACTS.map((fact) => fact.text).join(" ");

    expect(blob).toContain("12 months from install");
    expect(blob).not.toContain("CLOSE_AT");
    expect(blob.toLowerCase()).not.toMatch(/\blease\b/);
    expect(blob).not.toContain("South Carolina home loop");
    expect(blob).not.toContain("Florida panhandle");

    await resetIntentStoreForTests();
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_win_1",
      brandLabel: "Win Co",
      tradeLabel: "tools",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(winnerSeatsFor([placed.bid]).length).toBe(0);
    expect((await listApprovedBidsForUser("user_win_1")).length).toBe(0);
    await setIntentStatus(placed.bid.id, "approved");
    const wins = await listApprovedBidsForUser("user_win_1");
    expect(wins.map((b) => b.id)).toContain(placed.bid.id);
    expect(wins.every((b) => b.status === "approved")).toBe(true);
    expect((await listApprovedBidsForUser("user_other")).length).toBe(0);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("cabin plaque names (no capture)", () => {
  test("reserves a name without bid or stripe fields", async () => {
    expect(CABIN_PLAQUE_LEAD).toContain("$58,000");
    expect(CABIN_PLAQUE_LEAD).toContain("$120,000");
    expect(CABIN_PLAQUE_LEAD.toLowerCase()).toContain("not a panel seat");
    expect(CABIN_PLAQUE_LEAD.toLowerCase()).not.toMatch(/\blease\b/);
    expect(CABIN_PLAQUE_LEAD).not.toContain("CLOSE_AT");

    await resetCabinPlaqueStoreForTests();
    const first = await reserveCabinPlaqueName("  River Co  ");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.status).toBe("created");
    expect(first.line.displayName).toBe("River Co");
    assertPlaqueIsNotABid(first.line);
    const again = await reserveCabinPlaqueName("river co");
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.status).toBe("exists");
    const invalid = await reserveCabinPlaqueName("x");
    expect(invalid.ok).toBe(false);
    const forged = {
      id: "plaque_x",
      displayName: "Forge",
      createdAt: "2026-09-14T00:00:00.000Z",
      standingUsd: 2500,
    } as CabinPlaqueLine;
    expect(() => assertPlaqueIsNotABid(forged)).toThrow(/must not carry/);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("content-rights picker (no tweet)", () => {
  test("stores prefs and keeps tweet/clock locks", async () => {
    expect(CONTENT_RIGHT_OPTIONS.map((option) => option.id)).toEqual([
      "film-seat",
      "tag-handle",
      "proof-stills",
    ]);
    expect(parseContentRightIds(["film-seat", "nope", "proof-stills"])).toEqual([
      "film-seat",
      "proof-stills",
    ]);
    expect(contentRightsCopyIsSafe()).toBe(true);

    await resetContentRightsStoreForTests();
    expect(await getContentRightsForUser("user_rights_1")).toEqual([
      "film-seat",
      "tag-handle",
      "proof-stills",
    ]);
    await saveContentRightsForUser({
      userId: "user_rights_1",
      rights: ["proof-stills", "bogus"],
    });
    expect(await getContentRightsForUser("user_rights_1")).toEqual([
      "proof-stills",
    ]);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("circuit story request (no tweet)", () => {
  test("saves corridor request without impressions or auto-tweet", async () => {
    expect(CIRCUIT_STORY_CORRIDORS.map((row) => row.id)).toEqual([
      "sc",
      "charlotte",
      "atlanta",
      "panhandle",
      "i26",
      "i77",
      "i85",
      "i95",
    ]);
    expect(CIRCUIT_STORY_LEAD).toContain("$58,000");
    expect(CIRCUIT_STORY_LEAD).toContain("$120,000");
    expect(CIRCUIT_STORY_LEAD.toLowerCase()).toContain("no auto-tweet");
    expect(circuitStoryCopyIsSafe()).toBe(true);

    await resetCircuitStoryStoreForTests();
    const first = await submitCircuitStoryRequest({
      email: "Story@Example.com",
      corridorId: "i85",
      note: "  Clemson Saturday proof  ",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.status).toBe("created");
    expect(first.request.email).toBe("story@example.com");
    expect(first.request.corridorId).toBe("i85");
    expect(first.request.note).toBe("Clemson Saturday proof");
    const again = await submitCircuitStoryRequest({
      email: "story@example.com",
      corridorId: "i85",
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.status).toBe("exists");
    const bad = await submitCircuitStoryRequest({
      email: "nope",
      corridorId: "i85",
    });
    expect(bad.ok).toBe(false);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("public sighting board (no bounty)", () => {
  test("posts a corridor note without impressions or bounty", async () => {
    expect(SIGHTING_LEAD).toContain("$58,000");
    expect(SIGHTING_LEAD).toContain("$120,000");
    expect(SIGHTING_LEAD.toLowerCase()).toContain("no bounty");
    expect(sightingCopyIsSafe()).toBe(true);

    await resetSightingStoreForTests();
    const first = await submitSighting({
      corridorId: "i26",
      note: "  Steel wrap at a grocery lot  ",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.status).toBe("created");
    expect(first.sighting.corridorId).toBe("i26");
    expect(first.sighting.note).toBe("Steel wrap at a grocery lot");
    const again = await submitSighting({
      corridorId: "i26",
      note: "steel wrap at a grocery lot",
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.status).toBe("exists");
    const bad = await submitSighting({ corridorId: "i26", note: "no" });
    expect(bad.ok).toBe(false);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("neighbor-panel combo lots (display only)", () => {
  test("lists hood neighbors without inventing a combo price", () => {
    const lot = comboLotFor("hood");
    expect(lot.neighbors.map((row) => row.id)).toEqual([
      "front-fascia",
      "roof",
      "driver-door",
      "passenger-door",
    ]);
    expect(lot.neighbors.map((row) => row.openingUsd)).toEqual([
      1200, 600, 1500, 1500,
    ]);
    expect(COMBO_LOT_LEAD).toContain("$58,000");
    expect(COMBO_LOT_LEAD).toContain("$120,000");
    expect(COMBO_LOT_LEAD.toLowerCase()).toContain("not a joint bid");
    expect(COMBO_LOT_LEAD.toLowerCase()).toContain("no combo price");
    expect(comboLotCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("immortal vault certificate (no cash)", () => {
  test("publishes etch-record copy without cash, VIN, or impressions", () => {
    expect(VAULT_CERTIFICATE_LEAD).toContain("$58,000");
    expect(VAULT_CERTIFICATE_LEAD).toContain("$120,000");
    expect(VAULT_CERTIFICATE_LEAD.toLowerCase()).toContain("not cash");
    expect(VAULT_CERTIFICATE_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(vaultCertificateCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("event request calendar (no livestream)", () => {
  test("saves a kind and optional day without a close clock", async () => {
    expect(EVENT_REQUEST_KINDS.map((row) => row.id)).toEqual([
      "shop-night",
      "campus",
      "hometown",
      "rest-stop",
    ]);
    expect(EVENT_REQUEST_LEAD).toContain("$58,000");
    expect(EVENT_REQUEST_LEAD).toContain("$120,000");
    expect(EVENT_REQUEST_LEAD.toLowerCase()).toContain("no livestream");
    expect(EVENT_REQUEST_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(EVENT_REQUEST_LEAD.toLowerCase()).toContain("not a close clock");
    expect(eventRequestCopyIsSafe()).toBe(true);

    await resetEventRequestStoreForTests();
    const first = await submitEventRequest({
      email: "Event@Example.com",
      kindId: "campus",
      requestedDate: "2026-11-07",
      note: "  After install  ",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.status).toBe("created");
    expect(first.request.email).toBe("event@example.com");
    expect(first.request.kindId).toBe("campus");
    expect(first.request.requestedDate).toBe("2026-11-07");
    expect(first.request.note).toBe("After install");
    const again = await submitEventRequest({
      email: "event@example.com",
      kindId: "campus",
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.status).toBe("exists");
    const bad = await submitEventRequest({
      email: "nope",
      kindId: "campus",
    });
    expect(bad.ok).toBe(false);
    const badDate = await submitEventRequest({
      email: "event@example.com",
      kindId: "hometown",
      requestedDate: "11/07/2026",
    });
    expect(badDate.ok).toBe(false);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("retired-vinyl framed artifact (no cash)", () => {
  test("publishes wrap-term frame copy without cash, VIN, or livestream price", () => {
    expect(RETIRED_VINYL_LEAD).toContain("$58,000");
    expect(RETIRED_VINYL_LEAD).toContain("$120,000");
    expect(RETIRED_VINYL_LEAD.toLowerCase()).toContain("12 months from install");
    expect(RETIRED_VINYL_LEAD.toLowerCase()).toContain("not cash");
    expect(RETIRED_VINYL_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(retiredVinylCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("season 2 board (no first-refusal sale)", () => {
  test("publishes year-two new-buy copy without inventing a price", () => {
    expect(SEASON_TWO_LEAD).toContain("$58,000");
    expect(SEASON_TWO_LEAD).toContain("$120,000");
    expect(SEASON_TWO_LEAD.toLowerCase()).toContain("new buy");
    expect(SEASON_TWO_LEAD.toLowerCase()).toContain("not a gift");
    expect(SEASON_TWO_LEAD.toLowerCase()).toContain("not for sale in v1");
    expect(SEASON_TWO_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(seasonTwoCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("dirty-vs-clean pair (preview only)", () => {
  test("publishes pair lead without lease, clock, bounty, or impressions", () => {
    expect(DIRTY_CLEAN_PAIR_LEAD).toContain("$58,000");
    expect(DIRTY_CLEAN_PAIR_LEAD).toContain("$120,000");
    expect(DIRTY_CLEAN_PAIR_LEAD.toLowerCase()).toContain("preview only");
    expect(DIRTY_CLEAN_PAIR_LEAD.toLowerCase()).toContain("not a photo");
    expect(DIRTY_CLEAN_PAIR_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(dirtyCleanPairCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("rain/night lighting after buyout (no livestream)", () => {
  test("publishes post-buyout lighting copy without clock or invented price", () => {
    expect(RAIN_NIGHT_LIGHTING_LEAD).toContain("$58,000");
    expect(RAIN_NIGHT_LIGHTING_LEAD).toContain("$120,000");
    expect(RAIN_NIGHT_LIGHTING_LEAD.toLowerCase()).toContain("post-buyout");
    expect(RAIN_NIGHT_LIGHTING_LEAD.toLowerCase()).toContain("not a livestream");
    expect(RAIN_NIGHT_LIGHTING_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(rainNightLightingCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("truck-order tracker after floor (no reserved VIN)", () => {
  test("publishes order-path copy without clock, VIN, or invented fee", () => {
    expect(TRUCK_ORDER_TRACKER_LEAD).toContain("$58,000");
    expect(TRUCK_ORDER_TRACKER_LEAD).toContain("$120,000");
    expect(TRUCK_ORDER_TRACKER_LEAD.toLowerCase()).toContain("order path");
    expect(TRUCK_ORDER_TRACKER_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(truckOrderTrackerCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("weekly mileage ledger (empty until truck)", () => {
  test("publishes empty-ledger copy without invented miles or reserved VIN", () => {
    expect(WEEKLY_MILEAGE_LEDGER_LEAD).toContain("$58,000");
    expect(WEEKLY_MILEAGE_LEDGER_LEAD).toContain("$120,000");
    expect(WEEKLY_MILEAGE_LEDGER_LEAD.toLowerCase()).toContain(
      "empty until the truck exists",
    );
    expect(WEEKLY_MILEAGE_LEDGER_LEAD.toLowerCase()).toContain(
      "no invented odometer",
    );
    expect(WEEKLY_MILEAGE_LEDGER_LEAD.toLowerCase()).toContain(
      "no reserved vin",
    );
    expect(weeklyMileageLedgerCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("landmark proof log (empty until truck)", () => {
  test("publishes empty-log copy without invented visits or reserved VIN", () => {
    expect(LANDMARK_PROOF_LOG_LEAD).toContain("$58,000");
    expect(LANDMARK_PROOF_LOG_LEAD).toContain("$120,000");
    expect(LANDMARK_PROOF_LOG_LEAD.toLowerCase()).toContain(
      "empty until the truck exists",
    );
    expect(LANDMARK_PROOF_LOG_LEAD.toLowerCase()).toContain(
      "no invented visits",
    );
    expect(LANDMARK_PROOF_LOG_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(landmarkProofLogCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("city time-in-market heatmap (empty until truck)", () => {
  test("publishes empty-heatmap copy without invented dwell or reserved VIN", () => {
    expect(CITY_TIME_HEATMAP_LEAD).toContain("$58,000");
    expect(CITY_TIME_HEATMAP_LEAD).toContain("$120,000");
    expect(CITY_TIME_HEATMAP_LEAD.toLowerCase()).toContain(
      "empty until the truck exists",
    );
    expect(CITY_TIME_HEATMAP_LEAD.toLowerCase()).toContain(
      "no invented city hours",
    );
    expect(CITY_TIME_HEATMAP_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(cityTimeHeatmapCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("qr-nfc scan counter (empty until truck)", () => {
  test("publishes empty-counter copy without invented scans or reserved VIN", () => {
    expect(QR_NFC_SCAN_COUNTER_LEAD).toContain("$58,000");
    expect(QR_NFC_SCAN_COUNTER_LEAD).toContain("$120,000");
    expect(QR_NFC_SCAN_COUNTER_LEAD.toLowerCase()).toContain(
      "empty until the truck exists",
    );
    expect(QR_NFC_SCAN_COUNTER_LEAD.toLowerCase()).toContain(
      "no invented scan counts",
    );
    expect(QR_NFC_SCAN_COUNTER_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(qrNfcScanCounterCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("city ping to panel winner (empty until truck)", () => {
  test("publishes empty-ping copy without invented pings or reserved VIN", () => {
    expect(CITY_PING_WINNER_LEAD).toContain("$58,000");
    expect(CITY_PING_WINNER_LEAD).toContain("$120,000");
    expect(CITY_PING_WINNER_LEAD.toLowerCase()).toContain(
      "empty until the truck exists",
    );
    expect(CITY_PING_WINNER_LEAD.toLowerCase()).toContain(
      "no invented city pings",
    );
    expect(CITY_PING_WINNER_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(cityPingWinnerCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("charge-stop takeover slots (empty until truck)", () => {
  test("publishes empty-slot copy without invented prices or reserved VIN", () => {
    expect(CHARGE_STOP_SLOTS_LEAD).toContain("$58,000");
    expect(CHARGE_STOP_SLOTS_LEAD).toContain("$120,000");
    expect(CHARGE_STOP_SLOTS_LEAD.toLowerCase()).toContain(
      "empty until the truck exists",
    );
    expect(CHARGE_STOP_SLOTS_LEAD.toLowerCase()).toContain(
      "no invented slot prices",
    );
    expect(CHARGE_STOP_SLOTS_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(chargeStopSlotsCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("route-day detour buyout (empty until truck)", () => {
  test("publishes empty-detour copy without invented prices or reserved VIN", () => {
    expect(ROUTE_DETOUR_BUYOUT_LEAD).toContain("$58,000");
    expect(ROUTE_DETOUR_BUYOUT_LEAD).toContain("$120,000");
    expect(ROUTE_DETOUR_BUYOUT_LEAD.toLowerCase()).toContain(
      "empty until the truck exists",
    );
    expect(ROUTE_DETOUR_BUYOUT_LEAD.toLowerCase()).toContain(
      "no invented detour prices",
    );
    expect(ROUTE_DETOUR_BUYOUT_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(routeDetourBuyoutCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("clemson saturday lock (empty until truck)", () => {
  test("publishes empty-lock copy without invented fee or reserved VIN", () => {
    expect(CLEMSON_SATURDAY_LOCK_LEAD).toContain("$58,000");
    expect(CLEMSON_SATURDAY_LOCK_LEAD).toContain("$120,000");
    expect(CLEMSON_SATURDAY_LOCK_LEAD.toLowerCase()).toContain(
      "empty until the truck exists",
    );
    expect(CLEMSON_SATURDAY_LOCK_LEAD.toLowerCase()).toContain(
      "no invented lock fee",
    );
    expect(CLEMSON_SATURDAY_LOCK_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(clemsonSaturdayLockCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});

test.describe("sighting bounty cards (empty until truck)", () => {
  test("publishes empty-card copy without invented bounty or reserved VIN", () => {
    expect(SIGHTING_BOUNTY_CARDS_LEAD).toContain("$58,000");
    expect(SIGHTING_BOUNTY_CARDS_LEAD).toContain("$120,000");
    expect(SIGHTING_BOUNTY_CARDS_LEAD.toLowerCase()).toContain(
      "empty until the truck exists",
    );
    expect(SIGHTING_BOUNTY_CARDS_LEAD.toLowerCase()).toContain(
      "no invented bounty dollars",
    );
    expect(SIGHTING_BOUNTY_CARDS_LEAD.toLowerCase()).toContain(
      "no invented impressions",
    );
    expect(SIGHTING_BOUNTY_CARDS_LEAD.toLowerCase()).toContain("no reserved vin");
    expect(sightingBountyCardsCopyIsSafe()).toBe(true);
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
  });
});
