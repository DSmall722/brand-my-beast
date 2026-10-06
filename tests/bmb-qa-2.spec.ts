import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  BRAND,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  OPEN_AT,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import {
  SOFT_CLOSE_MS,
  WINNER_PAY_MS,
  publishedCloseLabelEt,
} from "../src/lib/campaign-window";
import {
  panelBoardMarkFor,
  panelOverlayLabel,
} from "../src/lib/panel-board";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { hotspotsForView, type TruckViewId } from "../src/lib/truck-views";

function leaderboardEmptyCopy(nowMs: number = Date.now()): string {
  return nowMs >= Date.parse(OPEN_AT)
    ? PUBLIC_COPY.bidDesk.leaderboardEmptyAfter
    : PUBLIC_COPY.bidDesk.leaderboardEmptyBefore;
}

async function expectSeatLinkRow(page: Page, view: TruckViewId) {
  const row = page.getByTestId("truck-seat-links");
  await expect(row).toBeVisible();
  const expected = [...hotspotsForView(view)].sort(
    (a, b) => panelBoardMarkFor(a.panelId).n - panelBoardMarkFor(b.panelId).n,
  );
  const links = row.locator("a");
  await expect(links).toHaveCount(expected.length);
  const fontSizes = await links.evaluateAll((nodes) =>
    nodes.map((el) => Number.parseFloat(getComputedStyle(el).fontSize)),
  );
  for (const size of fontSizes) expect(size).toBeGreaterThanOrEqual(12);
  for (let i = 0; i < expected.length; i += 1) {
    const spot = expected[i]!;
    const link = links.nth(i);
    await expect(link).toHaveText(
      panelOverlayLabel(panelBoardMarkFor(spot.panelId)),
    );
    await expect(link).toHaveAttribute("href", `/panels/${spot.panelId}`);
    const linkBox = await box(link);
    expect(linkBox.height).toBeGreaterThanOrEqual(44);
  }
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value, (await locator.getAttribute("data-testid")) ?? "box").toBeTruthy();
  return value!;
}

test.describe("BMB-QA-2 legal, leaderboard, hotspots, contact", () => {
  test("open-at copy matches the locked noon instant", () => {
    expect(BRAND.email).toBe("hello@brandmybeast.com");
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(new Date(OPEN_AT));
    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    expect(`${pick("month")} ${pick("day")}`).toBe("Oct 6");
    expect(`${pick("hour")}:${pick("minute")} ${pick("dayPeriod")}`).toBe(
      "12:00 PM",
    );
    expect(PUBLIC_COPY.bidDesk.leaderboardEmptyBefore).toBe(
      "No bids yet. Bidding opens Oct 6 at noon ET.",
    );
    expect(PUBLIC_COPY.meta.description).toBe(
      `${PANELS.length} ad panels on one Cybertruck, wrapped for a year and driven across the Southeast. Bidding is open through Nov 2 at noon ET.`,
    );
    expect(PUBLIC_COPY.meta.description).not.toContain("opens Oct");
    expect(PUBLIC_COPY.meta.description).not.toMatch(/[—–]/);
    expect(PUBLIC_COPY.board.depositLine).not.toMatch(/when bidding opens/i);
    expect(PUBLIC_COPY.waitlist.success).toBe("Thanks. We will be in touch.");
    expect(PUBLIC_COPY.waitlist.success).not.toMatch(/bidding opens/i);
    expect(PUBLIC_COPY.bidDesk.leaderboardEmptyAfter).toBe(
      "No bids yet. Be the first to put your brand on the Beast.",
    );
    expect(PANELS).toHaveLength(11);
    expect(DEPOSIT_PERCENT).toBe(20);
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(SOFT_CLOSE_MS).toBe(10 * 60 * 1000);
    expect(WINNER_PAY_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(publishedCloseLabelEt()).toContain("Nov 2");
    expect(publishedCloseLabelEt()).toContain("12:00 PM ET");
  });

  test("privacy names bid data, Stripe, and the public mailbox", async ({
    page,
  }) => {
    await page.goto("/privacy");
    const bids = page.getByTestId("privacy-bids");
    await expect(bids).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Bids" })).toBeVisible();
    await expect(bids).toContainText("name");
    await expect(bids).toContainText("email");
    await expect(bids).toContainText("brand name");
    await expect(bids).toContainText("the logo you upload");
    await expect(bids).toContainText("bid amounts");

    const payments = page.getByTestId("privacy-payments");
    await expect(payments).toContainText("Stripe");
    await expect(payments).toContainText("full card numbers");
    await expect(payments.locator("a")).toHaveAttribute(
      "href",
      "https://stripe.com/privacy",
    );
    await expect(page.getByTestId("privacy-why")).toContainText("leaderboard");
    await expect(page.getByTestId("privacy-contact")).toContainText(BRAND.email);
    await expect(page.getByTestId("privacy-cookies")).not.toContainText("\u2014");
    await expect(page.getByTestId("privacy-cookies")).not.toContainText("\u2013");
  });

  test("terms keep one 7 day rule and the truck name the site uses", async ({
    page,
  }) => {
    await page.goto("/terms");
    const text = await page.getByTestId("terms-page").innerText();
    expect(text.match(/7 days/g)).toHaveLength(1);
    expect(text.toLowerCase()).not.toContain("buyout");
    expect(text).not.toContain("creating an account");
    expect(text).toContain("Cyberbeast");
    expect(text).not.toContain("Cybertruck");
    expect(text).toContain("Current Bid");
    expect(text).toContain(String(PANELS.length));
    expect(text).toContain(`${DEPOSIT_PERCENT}%`);
    expect(text).toContain("Stripe");
    expect(text).toContain(formatUsd(FLOOR_USD));
    expect(text).toContain(publishedCloseLabelEt());
    expect(text).toContain("10 minutes");
    const bids = await page.getByTestId("terms-bids").innerText();
    expect(bids.match(/7 days/g)).toHaveLength(1);
    expect(bids.match(/forfeit/gi)).toHaveLength(1);
  });

  test("empty leaderboard uses site chrome and the open-at line", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/leaderboard");
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.getByTestId("site-footer")).toBeVisible();
    await expect(page.getByTestId("leaderboard-empty")).toContainText(
      leaderboardEmptyCopy(),
    );
    const link = page.getByTestId("leaderboard-panels-link");
    await expect(link).toHaveAttribute("href", "/#panels");
    await expect(link).toHaveText("See the panels");
    await expect(page).toHaveTitle(`Leaderboard | ${BRAND.name}`);
    expect(await page.title()).not.toContain("\u2014");

    const home = await page.request.get("/");
    expect(home.status()).toBe(200);
    await page.goto("/#panels");
    await expect(page.locator("#panels")).toBeAttached();
    expect(page.url()).not.toContain("404");
  });

  test("hotspot labels and hit boxes meet the phone and desktop rules", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    for (const view of ["front", "driver", "passenger", "rear"] as const) {
      await page.getByTestId(`truck-view-${view}`).click();
      await expect(page.locator(".truck-seat-name")).toHaveCount(0);
      await expectSeatLinkRow(page, view);

      const seats = page.locator("a[data-testid^='truck-seat-']");
      const count = await seats.count();
      const boxes: { id: string | null; box: { x: number; y: number; width: number; height: number } }[] = [];
      for (let i = 0; i < count; i += 1) {
        const seat = seats.nth(i);
        const hit = await box(seat);
        expect(hit.width).toBeGreaterThanOrEqual(44);
        expect(hit.height).toBeGreaterThanOrEqual(44);
        boxes.push({ id: await seat.getAttribute("data-seat-id"), box: hit });
      }
      if (view === "rear") {
        const tail = boxes.find((row) => row.id === "tailgate")?.box;
        const rear = boxes.find((row) => row.id === "rear-bumper")?.box;
        expect(tail).toBeTruthy();
        expect(rear).toBeTruthy();
        expect(intersects(tail!, rear!)).toBe(false);
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator(".truck-seat-name")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-links")).not.toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/panels/hood");
    await expect(page.locator(".truck-seat-name")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-links")).toHaveCount(0);
  });

  test("bid modal close control is at least 44px on a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/panels/hood");
    await page.getByTestId("seat-primary-cta").click();
    const close = page.getByTestId("bid-modal-close");
    await expect(close).toBeVisible();
    await expect(close).toHaveText("Close");
    const hit = await box(close);
    expect(hit.width).toBeGreaterThanOrEqual(44);
    expect(hit.height).toBeGreaterThanOrEqual(44);
  });

  test("contact submit leaves Notifying and shows a field error", async ({
    page,
  }) => {
    await page.route("**/api/waitlist", (route) => route.abort());
    await page.goto("/#contactus");
    await page.getByTestId("waitlist-email").fill("qa2@example.com");
    await page.getByTestId("waitlist-submit").click();
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );
    await expect(page.getByTestId("waitlist-submit")).not.toHaveText("Notifying…");
    const error = page.getByTestId("waitlist-email-error");
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute("role", "alert");
    await expect(error).toHaveText(PUBLIC_COPY.waitlist.failed);
    await expect(
      page.getByText(PUBLIC_COPY.waitlist.failed, { exact: true }),
    ).toHaveCount(1);
    await expect(page.getByTestId("waitlist-status")).not.toContainText(
      PUBLIC_COPY.waitlist.failed,
    );
    const email = page.getByTestId("waitlist-email");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAttribute("aria-describedby", /waitlist-email-error/);
    const emailBox = await box(email);
    const errorBox = await box(error);
    expect(errorBox.y).toBeGreaterThan(emailBox.y);
    expect(errorBox.y).toBeLessThan(emailBox.y + emailBox.height + 120);
  });

  test("panel copy uses the short vinyl lines and Minimum bid", async ({
    page,
  }) => {
    expect(PUBLIC_COPY.seat.bumperWrapOnly).toBe(
      "Vinyl wrap is the only option for the bumper.",
    );
    expect(PUBLIC_COPY.seat.wrapTwelveMonths).toBe(
      "Vinyl wrap for 12 months after installation.",
    );
    await page.goto("/panels/front-bumper");
    await expect(page.getByTestId("seat-lead")).toHaveText(
      PUBLIC_COPY.seat.bumperWrapOnly,
    );
    await page.goto("/panels/hood");
    await expect(page.getByTestId("seat-lead")).toContainText(
      PUBLIC_COPY.seat.wrapTwelveMonths,
    );
    await expect(page.getByTestId("panel-stats")).toContainText("Minimum bid");
    await expect(page.getByTestId("panel-stats")).not.toContainText("Min next");
  });

  test("changed pages do not render an em dash or en dash", async ({
    page,
  }) => {
    for (const path of ["/privacy", "/terms", "/leaderboard"]) {
      await page.goto(path);
      const text = await page.locator("body").innerText();
      expect(text, path).not.toContain("\u2014");
      expect(text, path).not.toContain("\u2013");
    }
    await page.goto("/leaderboard");
    const title = await page.title();
    expect(title).toBe(`Leaderboard | ${BRAND.name}`);
    expect(title).not.toContain("\u2014");
    expect(title).not.toContain("\u2013");
  });
});
