import { expect, test } from "@playwright/test";
import { CLOSE_AT, OPEN_AT, PANELS } from "../src/lib/campaign";
import {
  resetCampaignClockForTests,
  resolveCampaignPhase,
  resolveSmokeDepositUsd,
} from "../src/lib/campaign-clock";
import { depositCheckoutUsd } from "../src/lib/deposit-flow";
import {
  SOFT_CLOSE_MS,
  WINNER_PAY_MS,
  campaignWindowSentence,
  effectiveCloseMs,
  planSettlement,
  publishedCloseLabelEt,
} from "../src/lib/campaign-window";
import type { IntentBid } from "../src/lib/intent";
import {
  formatCampaignInstantEt,
  formatSeatLogTime,
} from "../src/lib/seat-log";

const OPEN_NOW = "2026-10-06T16:00:00.000Z";
const BEFORE_OPEN = "2026-10-06T15:00:00.000Z";
const AFTER_CLOSE = "2026-11-03T18:00:00.000Z";

function easternOffsetMinutes(iso: string): number {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "0";
  const asUtc = Date.UTC(
    Number(pick("year")),
    Number(pick("month")) - 1,
    Number(pick("day")),
    Number(pick("hour")) % 24,
    Number(pick("minute")),
    Number(pick("second")),
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

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
    expect(OPEN_AT).toBe("2026-10-06T16:00:00.000Z");
    expect(CLOSE_AT).toBe("2026-11-02T17:00:00.000Z");
    expect(easternOffsetMinutes(OPEN_AT)).toBe(-240);
    expect(easternOffsetMinutes(CLOSE_AT ?? "")).toBe(-300);
    expect(formatSeatLogTime(OPEN_AT)).toBe("Oct 6, 2026, 12:00 PM ET");
    expect(formatSeatLogTime(CLOSE_AT ?? "")).toBe("Nov 2, 2026, 12:00 PM ET");
    expect(formatCampaignInstantEt(OPEN_AT)).toBe("Tue Oct 6, 2026, 12:00 PM ET");
    expect(formatCampaignInstantEt(CLOSE_AT ?? "")).toBe(
      "Mon Nov 2, 2026, 12:00 PM ET",
    );
    expect(publishedCloseLabelEt()).toBe("Mon Nov 2, 2026, 12:00 PM ET");
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
    await expect(window).toContainText("Oct 6, 2026, 12:00 PM ET");
    await expect(window).toContainText("Nov 2, 2026, 12:00 PM ET");
    await expect(page.getByTestId("faq-close-date")).toContainText(
      "Tuesday, October 6, 2026 at 12:00 PM ET",
    );
    await expect(page.getByTestId("faq-close-date")).toContainText(
      "Monday, November 2, 2026 at 12:00 PM ET",
    );
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
    await expect(page.getByTestId("panel-pending-hood")).toContainText("Pending");
    await expect(page.getByTestId("auction-top")).not.toContainText("Too Early");
    await expect(page.getByTestId("day-by-day")).toHaveAttribute(
      "data-source",
      "live",
    );
    await expect(page.getByTestId("day-by-day")).not.toContainText("Sample Mark");

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
    await expect(page.getByTestId("panel-pending-hood")).toHaveCount(0);
    await expect(page.getByTestId("panel-current-bid-hood")).toHaveText(
      "Current Bid $2,500",
    );
    await expect(page.getByTestId("panel-current-bid-front-bumper")).toHaveText(
      "Opening floor $500",
    );

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

  test("a bid in the last 10 minutes extends the close on the server", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const closeMs = Date.parse(CLOSE_AT ?? "");
    const sniperNow = new Date(closeMs - 5 * 60 * 1000).toISOString();
    const duringExtension = new Date(closeMs + 60 * 1000).toISOString();
    const afterExtension = new Date(closeMs + 21 * 60 * 1000).toISOString();

    const closed = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: duringExtension },
    });
    expect(closed.ok()).toBeTruthy();
    const tooLate = await request.post("/api/bid", {
      data: {
        panelId: "hood",
        standingUsd: 2500,
        brandLabel: "Late Brand",
        tradeLabel: "tools",
        email: "late@example.com",
      },
    });
    expect(tooLate.status()).toBe(403);

    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: sniperNow },
    });
    expect(opened.ok()).toBeTruthy();
    const sniper = await request.post("/api/bid", {
      data: {
        panelId: "driver-door",
        standingUsd: 4500,
        brandLabel: "Sniper Brand",
        tradeLabel: "tools",
        email: "sniper@example.com",
      },
    });
    expect(sniper.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.getByTestId("campaign-window")).toContainText(
      "Nov 2, 2026, 12:10 PM ET",
    );
    await expect(page.getByTestId("campaign-window")).toContainText(
      "last 10 minutes",
    );

    const extended = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: duringExtension },
    });
    expect(extended.ok()).toBeTruthy();
    const inside = await request.post("/api/bid", {
      data: {
        panelId: "tailgate",
        standingUsd: 2500,
        brandLabel: "Inside Brand",
        tradeLabel: "tools",
        email: "inside@example.com",
      },
    });
    expect(inside.ok()).toBeTruthy();

    const past = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: afterExtension },
    });
    expect(past.ok()).toBeTruthy();
    const rejected = await request.post("/api/bid", {
      data: {
        panelId: "hood",
        standingUsd: 2500,
        brandLabel: "Past Brand",
        tradeLabel: "tools",
        email: "past@example.com",
      },
    });
    expect(rejected.status()).toBe(403);
    const body = (await rejected.json()) as { code: string };
    expect(body.code).toBe("bidding_closed");
  });

  test("rear bumper shows its opening price", async ({ page, request }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const rear = PANELS.find((panel) => panel.id === "rear-bumper");
    const front = PANELS.find((panel) => panel.id === "front-bumper");
    expect(rear?.openingUsd).toBe(500);
    expect(front?.openingUsd).toBe(500);

    await page.goto("/");
    const rearBid = page.getByTestId("panel-current-bid-rear-bumper");
    await expect(rearBid).toBeVisible();
    await expect(rearBid).toHaveText("Opening floor $500");
    const box = await rearBid.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(8);
    await expect(page.getByTestId("panel-current-bid-front-bumper")).toHaveText(
      "Opening floor $500",
    );

    await page.getByTestId("panel-link-rear-bumper").click();
    await expect(page.getByTestId("bid-modal-current")).toHaveText("$500");
    await expect(page.getByTestId("bid-modal-minimum")).toHaveText("$500");

    await page.goto("/panels/rear-bumper");
    await expect(page.getByTestId("panel-standing")).toHaveText("$500");
    await expect(page.getByTestId("panel-stats")).toHaveAttribute(
      "data-standing-usd",
      "500",
    );
    const opening = page
      .getByTestId("panel-stats")
      .locator("div")
      .filter({ hasText: "Opening" });
    await expect(opening).toContainText("$500");
  });

  test("a webhook without the mock header is rejected", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", {
      data: { id: "evt_bad", type: "checkout.session.completed" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("SMOKE_BIDDING_OPEN production hatch", () => {
  test.beforeEach(() => {
    resetCampaignClockForTests();
  });
  test.afterEach(() => {
    resetCampaignClockForTests();
  });

  function phaseKind(
    nowIso: string,
    flags: {
      VERCEL_ENV?: string;
      LIVE_BIDDING?: string;
      SMOKE_BIDDING_OPEN?: string;
      PREVIEW_BIDDING_OPEN?: string;
    },
  ) {
    const env: NodeJS.ProcessEnv = { NODE_ENV: "test", ...flags };
    return resolveCampaignPhase([], Date.parse(nowIso), env).kind;
  }

  test("production + LIVE_BIDDING + SMOKE_BIDDING_OPEN opens the desk before OPEN_AT", () => {
    expect(
      phaseKind(BEFORE_OPEN, {
        VERCEL_ENV: "production",
        LIVE_BIDDING: "true",
        SMOKE_BIDDING_OPEN: "true",
      }),
    ).toBe("open");
    expect(
      phaseKind(BEFORE_OPEN, {
        VERCEL_ENV: "production",
        LIVE_BIDDING: "1",
        SMOKE_BIDDING_OPEN: "1",
      }),
    ).toBe("open");
  });

  test("missing SMOKE_BIDDING_OPEN keeps production before_open before OPEN_AT", () => {
    expect(
      phaseKind(BEFORE_OPEN, {
        VERCEL_ENV: "production",
        LIVE_BIDDING: "true",
      }),
    ).toBe("before_open");
  });

  test("missing LIVE_BIDDING keeps production flag_off before OPEN_AT", () => {
    expect(
      phaseKind(BEFORE_OPEN, {
        VERCEL_ENV: "production",
        SMOKE_BIDDING_OPEN: "true",
      }),
    ).toBe("flag_off");
  });

  test("missing VERCEL_ENV=production keeps the desk before_open before OPEN_AT", () => {
    expect(
      phaseKind(BEFORE_OPEN, {
        VERCEL_ENV: "preview",
        LIVE_BIDDING: "true",
        SMOKE_BIDDING_OPEN: "true",
      }),
    ).toBe("before_open");
  });

  test("PREVIEW_BIDDING_OPEN stays ignored on production", () => {
    expect(
      phaseKind(BEFORE_OPEN, {
        VERCEL_ENV: "production",
        LIVE_BIDDING: "true",
        PREVIEW_BIDDING_OPEN: "true",
      }),
    ).toBe("before_open");
  });

  test("production smoke hatch still respects close", () => {
    expect(
      phaseKind(AFTER_CLOSE, {
        VERCEL_ENV: "production",
        LIVE_BIDDING: "true",
        SMOKE_BIDDING_OPEN: "true",
      }),
    ).toBe("closed");
  });
});

test.describe("SMOKE_DEPOSIT_USD checkout override", () => {
  const smoke: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    VERCEL_ENV: "production",
    LIVE_BIDDING: "true",
    SMOKE_BIDDING_OPEN: "true",
  };

  test("production smoke hatch charges SMOKE_DEPOSIT_USD instead of 20%", () => {
    const env: NodeJS.ProcessEnv = { ...smoke, SMOKE_DEPOSIT_USD: "1" };
    expect(resolveSmokeDepositUsd(env)).toBe(1);
    expect(depositCheckoutUsd(500, env)).toBe(1);
    expect(depositCheckoutUsd(2500, env)).toBe(1);
  });

  test("unset or invalid SMOKE_DEPOSIT_USD keeps the 20% deposit", () => {
    expect(resolveSmokeDepositUsd(smoke)).toBeNull();
    expect(depositCheckoutUsd(500, smoke)).toBe(100);
    expect(
      depositCheckoutUsd(500, { ...smoke, SMOKE_DEPOSIT_USD: "1.5" }),
    ).toBe(100);
    expect(
      depositCheckoutUsd(500, { ...smoke, SMOKE_DEPOSIT_USD: "0" }),
    ).toBe(100);
    expect(
      depositCheckoutUsd(500, { ...smoke, SMOKE_DEPOSIT_USD: "abc" }),
    ).toBe(100);
  });

  test("SMOKE_DEPOSIT_USD is ignored when the smoke hatch is off", () => {
    expect(
      depositCheckoutUsd(500, {
        NODE_ENV: "test",
        VERCEL_ENV: "production",
        LIVE_BIDDING: "true",
        SMOKE_DEPOSIT_USD: "1",
      }),
    ).toBe(100);
    expect(
      depositCheckoutUsd(500, {
        NODE_ENV: "test",
        VERCEL_ENV: "preview",
        LIVE_BIDDING: "true",
        SMOKE_BIDDING_OPEN: "true",
        SMOKE_DEPOSIT_USD: "1",
      }),
    ).toBe(100);
  });
});
