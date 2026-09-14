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
  assertNoteRequiredForReject,
  artworkChecklistForPanel,
} from "../src/lib/artwork-approval";
import {
  HOMETOWN_LANES,
  hometownLaneCopyIsSafe,
  hometownLaneLabels,
} from "../src/lib/hometown-lane";
import { isShopPartnerEmail } from "../src/lib/auth/shop-partner";
import {
  WINNER_PORTAL_FACTS,
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
  listBidsForPanel,
  listApprovedBids,
  listApprovedBidsForUser,
  listDecidedBids,
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

test.describe("artwork approval thread (no capture)", () => {
  test("requires reject note and lists decided bids", async () => {
    expect(assertNoteRequiredForReject({ decision: "approved", note: "" }).ok).toBe(
      true,
    );
    expect(
      assertNoteRequiredForReject({ decision: "rejected", note: "" }).ok,
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
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_art_1",
      brandLabel: "Art Co",
      tradeLabel: "tools",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    await setIntentStatus(placed.bid.id, "rejected");
    const decided = await listDecidedBids();
    expect(decided.map((b) => b.id)).toContain(placed.bid.id);
    expect(decided[0]?.status).toBe("rejected");
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

test.describe("winner portal (no capture)", () => {
  test("lists only this user's approved seats", async () => {
    expect(WINNER_PORTAL_FACTS.some((fact) => fact.id === "wrap-term")).toBe(
      true,
    );
    expect(WINNER_PORTAL_FACTS.some((fact) => fact.id === "etch-lock")).toBe(
      true,
    );
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
    expect(CABIN_PLAQUE_LEAD.toLowerCase()).toContain("not a bid");
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
