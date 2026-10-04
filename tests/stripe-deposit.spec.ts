import { expect, test } from "@playwright/test";
import { CLOSE_AT, OPEN_AT } from "../src/lib/campaign";
import {
  SOFT_CLOSE_MS,
  WINNER_PAY_MS,
  campaignWindowSentence,
  effectiveCloseMs,
  planSettlement,
} from "../src/lib/campaign-window";
import type { IntentBid } from "../src/lib/intent";

const OPEN_NOW = "2026-10-06T16:00:00.000Z";
const BEFORE_OPEN = "2026-10-05T15:00:00.000Z";
const AFTER_CLOSE = "2026-11-03T18:00:00.000Z";

function paid(input: {
  id: string;
  panelId: IntentBid["panelId"];
  standingUsd: number;
  createdAt: string;
  userId?: string;
  invoiceCreditedAt?: string | null;
  remainderDueAt?: string | null;
  remainderPaidAt?: string | null;
}): IntentBid {
  const deposit = Math.round(input.standingUsd * 0.2);
  return {
    id: input.id,
    panelId: input.panelId,
    userId: input.userId ?? `deposit:${input.id}@example.com`,
    brandLabel: input.id,
    tradeLabel: "tools",
    standingUsd: input.standingUsd,
    depositUsd: deposit,
    status: "listed",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    idempotencyKey: null,
    artworkUrl: null,
    proxyMaxUsd: null,
    floorSaveUsd: null,
    deletedAt: null,
    depositPaidAt: input.createdAt,
    paymentId: `pi_${input.id}`,
    refundStatus: "none",
    capturedUsd: deposit,
    creditUsd: 0,
    checkoutSessionId: null,
    remainderDueAt: input.remainderDueAt ?? null,
    remainderPaidAt: input.remainderPaidAt ?? null,
    invoiceCreditedAt: input.invoiceCreditedAt ?? null,
  };
}

test.describe("stripe deposit and campaign window", () => {
  test.afterEach(async ({ request }) => {
    await request.post("/api/test/campaign-clock", { data: { reset: true } });
  });

  test("locked instants and soft close", () => {
    expect(OPEN_AT).toBe("2026-10-05T16:00:00.000Z");
    expect(CLOSE_AT).toBe("2026-11-02T17:00:00.000Z");
    const close = CLOSE_AT ?? "";
    const closeMs = Date.parse(close);
    const sniper = new Date(closeMs - 5 * 60 * 1000).toISOString();
    const once = effectiveCloseMs(close, [sniper]);
    expect(once).toBe(closeMs + SOFT_CLOSE_MS);
    expect(effectiveCloseMs(close, [sniper, sniper])).toBe(once);
    const later = new Date(closeMs + 60 * 1000).toISOString();
    expect(effectiveCloseMs(close, [sniper, later])).toBe(closeMs + SOFT_CLOSE_MS * 2);
  });

  test("settlement refunds a floor miss and credits a winner", () => {
    const closeMs = Date.parse(CLOSE_AT ?? "");
    const after = closeMs + 60_000;
    const miss = planSettlement(
      [paid({ id: "small", panelId: "hood", standingUsd: 2500, createdAt: OPEN_NOW })],
      after,
      closeMs,
    );
    expect(miss.map((action) => action.kind)).toEqual(["refund"]);

    const winner = paid({
      id: "win",
      panelId: "hood",
      standingUsd: 60000,
      createdAt: OPEN_NOW,
    });
    const next = paid({
      id: "next",
      panelId: "hood",
      standingUsd: 20000,
      createdAt: "2026-10-07T16:00:00.000Z",
    });
    const rest = paid({
      id: "rest",
      panelId: "hood",
      standingUsd: 5000,
      createdAt: "2026-10-08T16:00:00.000Z",
    });
    const hit = planSettlement([rest, winner, next], after, closeMs);
    expect(hit.find((action) => action.bidId === "win")?.kind).toBe("credit");
    expect(hit.find((action) => action.bidId === "next")).toBeUndefined();
    expect(hit.find((action) => action.bidId === "rest")?.kind).toBe("refund");

    const forfeited = planSettlement(
      [
        {
          ...winner,
          invoiceCreditedAt: OPEN_NOW,
          remainderDueAt: new Date(closeMs + WINNER_PAY_MS).toISOString(),
        },
        next,
      ],
      closeMs + WINNER_PAY_MS + 1000,
      closeMs,
    );
    expect(forfeited.find((action) => action.bidId === "win")?.kind).toBe("forfeit");
    expect(forfeited.find((action) => action.bidId === "next")?.kind).toBe("credit");
  });

  test("desk stays closed until the test clock opens it", async ({ request }) => {
    const closed = await request.post("/api/bid", {
      data: {
        panelId: "hood",
        standingUsd: 2500,
        brandLabel: "Closed Brand",
        tradeLabel: "tools",
        email: "closed@example.com",
      },
    });
    expect(closed.status()).toBe(403);
    const closedBody = (await closed.json()) as { code: string };
    expect(closedBody.code).toBe("bidding_closed");
  });

  test("homepage shows the ET window and hides the old close span", async ({ page }) => {
    await page.goto("/");
    const window = page.getByTestId("campaign-window");
    await expect(window).toContainText("Oct 5, 2026, 12:00 PM ET");
    await expect(window).toContainText("Nov 2, 2026, 12:00 PM ET");
    await expect(page.getByTestId("close-copy")).toHaveCount(0);
    expect(campaignWindowSentence({
      kind: "flag_off",
      openAt: OPEN_AT,
      closeAt: CLOSE_AT ?? OPEN_AT,
      effectiveCloseAt: CLOSE_AT ?? OPEN_AT,
    })).toContain("ET");
  });

  test("unpaid bid stays pending and a paid deposit raises the board", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: OPEN_NOW },
    });
    expect(opened.ok()).toBeTruthy();

    const early = await request.post("/api/bid", {
      data: {
        panelId: "hood",
        standingUsd: 2500,
        brandLabel: "Too Early",
        tradeLabel: "tools",
        email: "early@example.com",
      },
    });
    expect(early.ok()).toBeTruthy();
    const placed = (await early.json()) as {
      bidId: string;
      depositDueUsd: number;
      checkoutUrl: string;
    };
    expect(placed.depositDueUsd).toBe(500);
    expect(placed.checkoutUrl).toContain("session_id=");

    await page.goto("/");
    await expect(page.getByTestId("raised-amount")).toHaveText("$0");
    await expect(page.getByTestId("panel-card-hood")).toContainText("Pending");
    await expect(page.getByTestId("auction-top")).not.toContainText("Too Early");

    const event = {
      id: "evt_deposit_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_mock_deposit_1",
          payment_status: "paid",
          payment_intent: "pi_test_hood",
          amount_total: 50000,
          metadata: { bidId: placed.bidId, kind: "deposit" },
        },
      },
    };
    const first = await request.post("/api/stripe/webhook", {
      data: event,
      headers: { "x-bmb-stripe-mock": "playwright-cron-secret" },
    });
    expect(first.ok()).toBeTruthy();
    const firstBody = (await first.json()) as { duplicate: boolean };
    expect(firstBody.duplicate).toBe(false);
    const second = await request.post("/api/stripe/webhook", {
      data: event,
      headers: { "x-bmb-stripe-mock": "playwright-cron-secret" },
    });
    const secondBody = (await second.json()) as { duplicate: boolean };
    expect(secondBody.duplicate).toBe(true);

    await page.goto("/");
    await expect(page.getByTestId("raised-amount")).toHaveText("$2,500");
    await expect(page.getByTestId("auction-top")).toContainText("Too Early");
    await expect(page.getByTestId("panel-card-hood")).not.toContainText("Pending");

    const rebid = await request.post("/api/bid", {
      data: {
        panelId: "hood",
        standingUsd: 2750,
        brandLabel: "Too Early",
        tradeLabel: "tools",
        email: "early@example.com",
      },
    });
    expect(rebid.ok()).toBeTruthy();
    const again = (await rebid.json()) as { depositDueUsd: number };
    expect(again.depositDueUsd).toBe(50);
  });

  test("bidding is closed before open and after close", async ({ request }) => {
    const before = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: BEFORE_OPEN },
    });
    expect(before.ok()).toBeTruthy();
    const beforeBid = await request.post("/api/bid", {
      data: {
        panelId: "hood",
        standingUsd: 2500,
        brandLabel: "Before",
        tradeLabel: "tools",
        email: "before@example.com",
      },
    });
    expect(beforeBid.status()).toBe(403);

    const after = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: AFTER_CLOSE },
    });
    expect(after.ok()).toBeTruthy();
    const afterBid = await request.post("/api/bid", {
      data: {
        panelId: "hood",
        standingUsd: 2500,
        brandLabel: "After",
        tradeLabel: "tools",
        email: "after@example.com",
      },
    });
    expect(afterBid.status()).toBe(403);
    const body = (await afterBid.json()) as { code: string };
    expect(body.code).toBe("bidding_closed");
  });

  test("a webhook without the mock header is rejected", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", {
      data: { id: "evt_bad", type: "checkout.session.completed" },
    });
    expect(res.status()).toBe(400);
  });
});
