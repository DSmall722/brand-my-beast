import { expect, test } from "@playwright/test";
import {
  assertIntentOnly,
  depositUsdForMark,
  minIncrementUsd,
  nextStandingUsd,
  type IntentBid,
} from "../src/lib/intent";

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
});
