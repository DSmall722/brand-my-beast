import { expect, type Page, test } from "@playwright/test";
import { buildAuctionLive, buildLeaderboard } from "../src/lib/auction-board";
import { buildDayByDay, bidDeskMode } from "../src/lib/bid-desk";
import { publicLogoUrl } from "../src/lib/public-mark";
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

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("bid desk: modal, hidden sign-in, unpaid, day by day", () => {
  test.describe.configure({ mode: "serial" });
  test("empty ledger has no invented days; live marks group by day", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(bidDeskMode(null)).toEqual({ kind: "closed" });

    const empty = buildDayByDay([]);
    expect(empty.days).toEqual([]);

    const listedOnly = buildDayByDay([
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
    expect(listedOnly.days.map((day) => day.dayKey)).toEqual([
      "2026-09-02",
      "2026-09-01",
    ]);
    expect(listedOnly.days[0]?.bidCount).toBe(1);
    expect(listedOnly.days[0]?.bidUsd).toBe(2500);
    expect(listedOnly.days[0]?.standingUsd).toBe(0);
    expect(listedOnly.days[1]?.bidUsd).toBe(500);
    expect(listedOnly.days[1]?.standingUsd).toBe(0);
    expect(listedOnly.days[0]?.rows[0]?.timeLabel).toContain("ET");
    expect(listedOnly.days[0]?.rows[0]?.brandLabel).toBe("Late Brand");
    expect(listedOnly.days[0]?.rows[0]?.panelName).toBe("Hood");

    const live = [
      mark({
        id: "hood-win",
        panelId: "hood",
        standingUsd: 2500,
        status: "approved",
        createdAt: "2026-09-02T16:00:00.000Z",
        brandLabel: "Hood Brand",
      }),
      mark({
        id: "hood-listed",
        panelId: "hood",
        standingUsd: 3000,
        status: "listed",
        createdAt: "2026-09-02T18:00:00.000Z",
        brandLabel: "Pending Brand",
      }),
      mark({
        id: "tail-win",
        panelId: "tailgate",
        standingUsd: 1500,
        status: "approved",
        createdAt: "2026-09-01T16:00:00.000Z",
        brandLabel: "Tail Brand",
      }),
      mark({
        id: "tail-old",
        panelId: "tailgate",
        standingUsd: 800,
        status: "outbid",
        createdAt: "2026-09-01T15:00:00.000Z",
        brandLabel: "Beaten Brand",
      }),
      mark({
        id: "floor-save",
        panelId: "front-fascia",
        standingUsd: 9000,
        status: "approved",
        createdAt: "2026-09-02T12:00:00.000Z",
        floorSaveUsd: 9000,
      }),
      mark({
        id: "gone",
        panelId: "front-bumper",
        standingUsd: 700,
        status: "withdrawn",
        createdAt: "2026-09-01T12:00:00.000Z",
      }),
    ];
    const days = buildDayByDay(live);
    const standingSum = days.days.reduce((sum, day) => sum + day.standingUsd, 0);
    expect(standingSum).toBe(4000);
    expect(days.days[0]?.dayKey).toBe("2026-09-02");
    expect(days.days[0]?.bidCount).toBe(2);
    expect(days.days[0]?.bidUsd).toBe(5500);
    expect(days.days[0]?.standingUsd).toBe(2500);
    expect(days.days[0]?.rows.map((row) => row.bidId)).toEqual([
      "hood-listed",
      "hood-win",
    ]);
    expect(days.days[1]?.bidCount).toBe(2);
    expect(days.days[1]?.bidUsd).toBe(2300);
    expect(days.days[1]?.standingUsd).toBe(1500);
    expect(days.days.some((day) => day.rows.some((row) => row.bidId === "floor-save"))).toBe(
      false,
    );
    expect(days.days.some((day) => day.rows.some((row) => row.bidId === "gone"))).toBe(
      false,
    );

    const hoodOnly = buildDayByDay(live, { panelId: "hood" });
    expect(hoodOnly.days).toHaveLength(1);
    expect(hoodOnly.days[0]?.bidUsd).toBe(5500);
    expect(hoodOnly.days[0]?.standingUsd).toBe(2500);
    expect(hoodOnly.days[0]?.rows.map((row) => row.bidId)).toEqual([
      "hood-listed",
      "hood-win",
    ]);
    expect(buildDayByDay(live, { panelId: "front-bumper" }).days).toEqual([]);

    expect(
      publicLogoUrl({
        status: "listed",
        artworkUrl: "https://cdn.example.com/pending.png",
        artworkApproval: "pending",
      }),
    ).toBeNull();
    expect(
      publicLogoUrl({
        status: "approved",
        artworkUrl: "https://cdn.example.com/live.png",
        artworkApproval: "approved",
      }),
    ).toBe("https://cdn.example.com/live.png");
    expect(
      publicLogoUrl({
        status: "outbid",
        artworkUrl: "https://cdn.example.com/live.png",
        artworkApproval: "approved",
      }),
    ).toBe("https://cdn.example.com/live.png");

    const board = buildLeaderboard(live);
    expect(board.bidCount).toBe(4);
    expect(board.rows.map((row) => row.bidId)).toEqual([
      "hood-listed",
      "hood-win",
      "tail-win",
      "tail-old",
    ]);
    expect(board.rows[0]?.publicLogoUrl).toBeNull();
    expect(board.rows[1]?.publicLogoUrl).toBeNull();
    const liveMarks = live.map((bid) =>
      bid.id === "hood-win"
        ? { ...bid, artworkUrl: "https://cdn.example.com/hood.png", artworkApproval: "approved" as const }
        : bid,
    );
    expect(buildLeaderboard(liveMarks).rows[1]?.publicLogoUrl).toBe(
      "https://cdn.example.com/hood.png",
    );
    const sep1 = buildAuctionLive(live, new Date("2026-09-01T18:00:00.000Z")).today;
    expect(sep1.map((row) => row.actionLabel)).toEqual(["Bid", "Outbid"]);
    expect(buildAuctionLive(live, new Date("2026-09-02T18:00:00.000Z")).today).toHaveLength(
      2,
    );
    expect(buildAuctionLive(live, new Date("2026-09-03T18:00:00.000Z")).today).toEqual(
      [],
    );
    expect(buildAuctionLive([], new Date("2026-09-02T18:00:00.000Z")).top).toEqual([]);
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
    await expect(page.locator("#main-content")).not.toContainText("unpaid");
    await expect(page.getByTestId("auction-top")).toContainText(
      "No standing bids yet.",
    );
    await expect(page.getByTestId("auction-today")).toContainText(
      "No bid or outbid yet today. Be the first.",
    );
    await expect(page.getByTestId("auction-top")).toContainText("Top brands");
    await expect(page.getByTestId("leaderboard-link")).toHaveAttribute(
      "href",
      "/leaderboard",
    );
    await page.goto("/leaderboard");
    await expect(page.getByTestId("leaderboard-page")).toHaveAttribute(
      "data-empty",
      "true",
    );
    await expect(page.getByTestId("leaderboard-empty")).toHaveText("No bids yet.");
    await expect(page.getByTestId("leaderboard-page")).not.toContainText("unpaid");
    await page.goto("/");

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

  test("seat Bid opens the same desk on that panel", async ({ page, request }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();

    await page.goto("/panels/tailgate");
    const cta = page.getByTestId("seat-primary-cta");
    await expect(cta).toHaveRole("button");
    await expect(cta).toHaveText("Bid");
    await expect(cta).toHaveAttribute("data-cta", "bid");
    await cta.click();

    await expect(page).toHaveURL(/\/panels\/tailgate$/);
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "Place a bid" })).toBeVisible();
    await expect(modal).toHaveAttribute("data-panel-id", "tailgate");
    await expect(page.getByTestId("bid-modal-panel")).toHaveValue("tailgate");
    await expect(page.getByTestId("bid-modal-email")).toBeVisible();
    await expect(page.getByTestId("bid-modal-brand")).toBeVisible();
    await expect(page.getByTestId("bid-modal-magic")).toContainText(
      "one-time email link",
    );
    await expect(page).not.toHaveURL(/signin/);

    await page.getByTestId("bid-modal-brand").fill("Seat Brand");
    await page.getByTestId("bid-modal-email").fill("seat@brandmybeast.com");
    await page.getByTestId("bid-modal-submit").click();
    await expect(page.getByTestId("bid-modal-result")).toHaveText(
      PUBLIC_COPY.bidDesk.closedResult,
    );
    await expect(page).toHaveURL(/\/panels\/tailgate$/);
  });

  test("day standing sums to raised; bid total includes beaten marks", async ({
    page,
    browser,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();

    const first = await browser.newPage();
    await signIn(first, "day-first@example.com");
    await first.goto("/panels/hood");
    await first.getByTestId("intent-brand").fill("Early Brand");
    await first.getByTestId("intent-trade").fill("tools");
    await first.getByTestId("intent-standing").fill("2500");
    await first.getByTestId("intent-submit").click();
    await expect(first.getByTestId("intent-success")).toBeVisible();
    await first.close();

    await page.goto("/");
    const history = page.getByTestId("day-by-day");
    await expect(history).toHaveAttribute("data-empty", "false");
    await expect(history).not.toContainText("Sample history");
    await expect(history).not.toContainText("unpaid");
    await expect(history).not.toContainText("paid");
    await expect(page.getByTestId("raised-amount")).toHaveText("$0");
    const listedStanding = history.locator("[data-standing]");
    await expect(listedStanding).toHaveCount(1);
    await expect(listedStanding).toHaveAttribute("data-standing", "0");
    await expect(listedStanding).toHaveAttribute("data-bid-usd", "2500");
    await expect(history.locator(".day-by-day-line")).toContainText("Early Brand");
    await expect(history.locator(".day-by-day-line")).toContainText("Hood");
    await expect(history.locator(".day-by-day-line")).toContainText("ET");

    const details = history.locator("details");
    await details.locator("summary").click();
    await expect(details).not.toHaveJSProperty("open", true);
    await details.locator("summary").click();
    await expect(history.locator(".day-by-day-line")).toBeVisible();

    const second = await browser.newPage();
    await signIn(second, "day-second@example.com");
    await second.goto("/panels/hood");
    await second.getByTestId("intent-brand").fill("Standing Brand");
    await second.getByTestId("intent-trade").fill("paint");
    await second.getByTestId("intent-standing").fill("2750");
    await second.getByTestId("intent-submit").click();
    await expect(second.getByTestId("intent-success")).toBeVisible();
    await second.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Standing Brand",
    );
    await operator.locator('[data-testid^="approve-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible();
    await operator.close();

    await page.goto("/");
    await expect(page.getByTestId("raised-amount")).toHaveText("$2,750");
    const approved = page.getByTestId("day-by-day").locator("[data-standing]");
    await expect(approved).toHaveCount(1);
    await expect(approved).toHaveAttribute("data-standing", "2750");
    await expect(approved).toHaveAttribute("data-bid-usd", "5250");
    const lines = page.getByTestId("day-by-day").locator(".day-by-day-line");
    await expect(lines).toHaveCount(2);
    await expect(page.getByTestId("day-by-day")).toContainText("Standing Brand");
    await expect(page.getByTestId("day-by-day")).toContainText("Early Brand");
    await expect(page.getByTestId("day-by-day")).not.toContainText("unpaid");
    await expect(page.getByTestId("day-by-day")).not.toContainText("paid");

    await page.goto("/panels/hood");
    const hoodHistory = page.getByTestId("day-by-day");
    await expect(hoodHistory).toHaveAttribute("data-empty", "false");
    await expect(hoodHistory).not.toContainText("Sample history");
    await expect(hoodHistory).not.toContainText("unpaid");
    await expect(hoodHistory).not.toContainText("paid");
    await expect(hoodHistory).not.toContainText("Hood");
    const hoodStanding = hoodHistory.locator("[data-standing]");
    await expect(hoodStanding).toHaveAttribute("data-standing", "2750");
    await expect(hoodStanding).toHaveAttribute("data-bid-usd", "5250");
    await expect(hoodHistory.locator(".day-by-day-line")).toHaveCount(2);
    await expect(hoodHistory).toContainText("Standing Brand");
    await expect(hoodHistory).toContainText("Early Brand");
    await expect(hoodHistory.locator("time").first()).toContainText("ET");
    await hoodHistory.locator("summary").click();
    await expect(hoodHistory.locator("details")).not.toHaveJSProperty("open", true);

    await page.goto("/panels/tailgate");
    await expect(page.getByTestId("day-by-day")).toHaveAttribute(
      "data-empty",
      "true",
    );
    await expect(page.getByTestId("day-by-day").locator(".day-by-day-list")).toHaveCount(
      0,
    );
  });

  test("held by stays name-only until the operator approves the logo", async ({
    page,
    browser,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const logo = "https://cdn.example.com/desk-logo.png";

    const bidder = await browser.newPage();
    await signIn(bidder, "logo-bidder@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Logo Brand");
    await bidder.getByTestId("intent-trade").fill("paint");
    await bidder.getByTestId("intent-standing").fill("2500");
    await bidder.getByTestId("intent-artwork-url").fill(logo);
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toBeVisible();
    await bidder.close();

    await page.goto("/");
    const held = page.getByTestId("panel-standing-hood");
    await expect(held).toHaveText("Logo Brand");
    await expect(held.locator("img")).toHaveCount(0);
    await expect(held.locator(".public-mark")).toHaveAttribute("data-artwork", "name");
    await expect(page.locator("#panels")).not.toContainText("unpaid");
    await expect(page.getByTestId("auction-top")).toContainText("Logo Brand");
    await expect(page.getByTestId("auction-top").locator("img")).toHaveCount(0);
    await expect(page.getByTestId("auction-today")).not.toContainText("unpaid");

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator");
    await operator.locator('[data-testid^="approve-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible();
    await operator.close();

    await page.goto("/");
    await expect(page.getByTestId("panel-standing-hood").locator("img")).toHaveAttribute(
      "src",
      logo,
    );
    await expect(page.getByTestId("auction-top").locator("img")).toHaveAttribute(
      "src",
      logo,
    );
    await page.goto("/leaderboard");
    await expect(page.getByTestId("leaderboard-count")).toContainText("1 bid from 1 brand");
    await expect(page.getByTestId("leaderboard-page")).toContainText("Logo Brand");
    await expect(page.getByTestId("leaderboard-page").locator("img")).toHaveAttribute(
      "src",
      logo,
    );
    await expect(page.getByTestId("leaderboard-page")).not.toContainText("unpaid");
  });
});
