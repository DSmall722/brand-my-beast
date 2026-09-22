import { expect, test } from "@playwright/test";
import { buildDayByDay, bidDeskMode } from "../src/lib/bid-desk";
import { CLOSE_AT, FLOOR_USD, GOAL_USD } from "../src/lib/campaign";
import type { IntentBid } from "../src/lib/intent";
import { PUBLIC_COPY } from "../src/lib/public-copy";

function mark(overrides: Partial<IntentBid> & Pick<IntentBid, "id" | "panelId" | "standingUsd" | "status" | "createdAt">): IntentBid {
  return {
    userId: "desk-user",
    brandLabel: "Desk Brand",
    tradeLabel: "tools",
    depositUsd: 0,
    updatedAt: overrides.createdAt,
    idempotencyKey: null,
    artworkUrl: null,
    proxyMaxUsd: null,
    floorSaveUsd: null,
    deletedAt: null,
    ...overrides,
  };
}

test.describe("bid desk: modal, hidden sign-in, unpaid, day by day", () => {
  test("empty ledger has no invented days; live marks group by day", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(bidDeskMode(null)).toEqual({ kind: "closed" });

    const empty = buildDayByDay([]);
    expect(empty.days).toEqual([]);

    const live = buildDayByDay([
      mark({
        id: "late",
        panelId: "hood",
        standingUsd: 2500,
        status: "listed",
        createdAt: "2026-09-02T16:00:00.000Z",
        brandLabel: "Late Brand",
      }),
      mark({
        id: "early",
        panelId: "rear-bumper",
        standingUsd: 500,
        status: "outbid",
        createdAt: "2026-09-01T16:00:00.000Z",
        brandLabel: "Early Brand",
      }),
    ]);
    expect(live.days.map((day) => day.dayKey)).toEqual([
      "2026-09-02",
      "2026-09-01",
    ]);
    expect(live.days[0]?.standingUsd).toBe(2500);
    expect(live.days[1]?.standingUsd).toBe(0);
  });

  test("homepage bid modal stays on the page and does not charge", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();

    const stripeHits: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("stripe.com") || url.includes("payment_intent")) {
        stripeHits.push(url);
      }
    });

    await page.goto("/");
    await expect(page.locator(".site-header").getByTestId("signin-link")).toHaveCount(
      0,
    );
    const history = page.getByTestId("day-by-day");
    await expect(history).toBeVisible();
    await expect(history).toHaveAttribute("data-empty", "true");
    await expect(history.getByRole("heading", { name: "Day by day" })).toBeVisible();
    await expect(history.locator(".day-by-day-list")).toHaveCount(0);
    await expect(history).not.toContainText("Sample history");
    await expect(history).not.toContainText("unpaid");
    await expect(history).not.toContainText("paid");
    await expect(page.getByTestId("raised-amount")).toHaveText("$0");

    await page.getByTestId("panel-link-hood").click();
    await expect(page).toHaveURL(/\/$/);
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("data-bid-window", "closed");
    await expect(page.getByTestId("bid-modal-panel")).toHaveValue("hood");
    await expect(page.getByTestId("bid-modal-current")).toHaveText("$2,500");
    await expect(page.getByTestId("bid-modal-minimum")).toHaveText("$2,500");
    await expect(page.getByTestId("bid-modal-amount")).toBeVisible();
    await expect(page.getByTestId("bid-modal-brand")).toBeVisible();
    await expect(page.getByTestId("bid-modal-email")).toBeVisible();
    await expect(page.getByTestId("bid-modal-logo")).toBeVisible();
    await expect(page.getByTestId("bid-modal-website")).toBeVisible();
    await expect(page.getByTestId("bid-modal-artwork")).toContainText(
      "operator approves artwork",
    );
    await expect(page.getByTestId("bid-modal-closed")).toBeVisible();
    await expect(modal).not.toContainText("PaymentIntent");

    await page.getByTestId("bid-modal-close").click();
    await expect(modal).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);

    await page.getByTestId("hero-primary-cta").click();
    await expect(page.getByTestId("bid-modal")).toBeVisible();
    await page.getByTestId("bid-modal-brand").fill("Desk Brand");
    await page.getByTestId("bid-modal-email").fill("desk@brandmybeast.com");
    await page.getByTestId("bid-modal-submit").click();
    await expect(page.getByTestId("bid-modal-result")).toHaveText(
      PUBLIC_COPY.bidDesk.closedResult,
    );
    await expect(page.getByTestId("bid-modal-result")).not.toContainText(
      "bid placed",
    );
    expect(stripeHits).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bid-modal")).toHaveCount(0);

    const desktop = page.viewportSize();
    expect(desktop?.width ?? 0).toBeGreaterThan(1000);
    await page.getByTestId("panel-link-hood").click();
    const desktopModal = page.getByTestId("bid-modal");
    await expect(desktopModal).toBeVisible();
    const desktopBox = await desktopModal.boundingBox();
    expect(desktopBox).not.toBeNull();
    if (!desktopBox || !desktop) throw new Error("desktop modal box missing");
    expect(desktopBox.width).toBeLessThanOrEqual(32 * 16 + 2);
    expect(desktopBox.x).toBeGreaterThanOrEqual(0);
    expect(desktopBox.x + desktopBox.width).toBeLessThanOrEqual(desktop.width + 1);
  });

  test("bid modal fits a 390px window", async ({ page, request }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByTestId("panel-link-hood").click();

    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "Place a bid" })).toBeVisible();
    await expect(page.getByTestId("bid-modal-close")).toBeVisible();

    const box = await modal.boundingBox();
    const title = await modal.getByRole("heading", { name: "Place a bid" }).boundingBox();
    const close = await page.getByTestId("bid-modal-close").boundingBox();
    expect(box && title && close).toBeTruthy();
    if (!box || !title || !close) return;

    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.width).toBeLessThanOrEqual(390 - 8);
    expect(box.x + box.width).toBeLessThanOrEqual(391);
    expect(title.x).toBeGreaterThanOrEqual(4);
    expect(title.x + title.width).toBeLessThanOrEqual(386);
    expect(close.x).toBeGreaterThanOrEqual(4);
    expect(close.x + close.width).toBeLessThanOrEqual(386);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    await expect(modal).toContainText(PUBLIC_COPY.bidDesk.closedLead);
  });
});
