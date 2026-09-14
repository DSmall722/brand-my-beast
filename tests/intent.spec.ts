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
  listBidsForPanel,
  placeIntentBid,
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
    expect(sql.toLowerCase()).not.toMatch(/stripe|setup_intent|captured/);
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
    });
    expect(first.ok).toBeTruthy();
    if (!first.ok) return;
    expect(first.bid.depositUsd).toBe(depositUsdForMark(first.bid.standingUsd));
    assertIntentOnly(first.bid);

    const second = await placeIntentBid({
      panelId: "hood",
      userId: "user_b",
      brandLabel: "Beta Brand",
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
});
