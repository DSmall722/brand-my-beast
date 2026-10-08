import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  BRAND,
  DEPOSIT_PERCENT,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import { WINNER_PAY_MS } from "../src/lib/campaign-window";
import { depositUsdForMark } from "../src/lib/intent";
import { PUBLIC_COPY } from "../src/lib/public-copy";

const OPEN_NOW = "2026-10-06T16:00:00.000Z";
const BUMPER_LINE = "Wrap only. Vinyl wrap for 12 months after installation.";
const SEND_FAILED = `That didn't send. Try again, or email ${BRAND.email}.`;
const DAYS = WINNER_PAY_MS / (24 * 60 * 60 * 1000);
const NO_DASH = /[\u2014\u2013]/;

type Box = { x: number; y: number; width: number; height: number };

function separation(a: Box, b: Box): number {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
  if (dx === 0) return dy;
  if (dy === 0) return dx;
  return Math.hypot(dx, dy);
}

async function box(locator: Locator): Promise<Box> {
  const value = await locator.boundingBox();
  expect(value, (await locator.getAttribute("data-testid")) ?? "box").toBeTruthy();
  return value!;
}

async function showView(page: Page, view: string) {
  await page.getByTestId(`truck-view-${view}`).click();
  await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
    "data-view",
    view,
  );
}

test.describe("BMB-QA-2-FIX4 Site QA items", () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ request }) => {
    await request.post("/api/test/campaign-clock", { data: { reset: true } });
  });

  test("privacy uses the Site QA lines and lime underlined links", async ({
    page,
  }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-collect")).toHaveText(
      "We collect the email you send through the contact form or the bid form, plus basic technical logs (for example IP address, user agent, and request timing). Bid details are described under Bids.",
    );
    await expect(page.getByTestId("privacy-page")).not.toContainText(
      "We also use waitlist and sign-in details to operate the board.",
    );
    await expect(page.getByTestId("privacy-providers")).toHaveText(
      "Providers that may process data on our behalf include hosting, the database, email delivery for bid and contact messages, and Stripe for payments. They only receive what they need to perform that work.",
    );
    await expect(page.getByTestId("privacy-retention")).toHaveText(
      "Contact emails are kept until we have answered or you ask us to delete them. Bid and brand information is kept while we run the auction and contact winners. Server logs are kept only as long as needed for security and operations.",
    );
    await expect(page.getByTestId("privacy-cookies")).toHaveText(
      "We use only the cookies the site needs to work.",
    );
    await expect(
      page.getByRole("heading", { level: 2, name: "Who processes it" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "How long we keep it" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "What we collect" }),
    ).toBeVisible();
    const text = await page.getByTestId("privacy-page").innerText();
    expect(text).not.toMatch(/waitlist/i);
    expect(text).not.toMatch(/sign-?in/i);
    expect(text).not.toMatch(NO_DASH);

    for (const locator of [
      page.locator("[data-testid='privacy-payments'] a"),
      page.locator("[data-testid='privacy-access'] a"),
      page.locator("[data-testid='privacy-contact'] a"),
    ]) {
      const paint = await locator.evaluate((el) => {
        const style = getComputedStyle(el);
        return { color: style.color, line: style.textDecorationLine };
      });
      expect(paint.color).toMatch(/214,\s*255,\s*63|rgb\(214 255 63/);
      expect(paint.line).toContain("underline");
    }
    await expect(page.getByTestId("site-footer")).toBeVisible();
  });

  test("terms states the seat, win, and Tesla lines once", async ({ page }) => {
    await page.goto("/terms");
    const bids = page.getByTestId("terms-bids");
    await expect(bids).toContainText(
      "Each seat shows its opening price until someone bids. After that it shows the current high bid.",
    );
    await expect(bids).toContainText(
      `If you win, pay the rest of your winning bid within ${DAYS} days. Your deposit counts toward it. If you don't pay in time, the deposit is forfeited and the seat goes to the next-highest bidder, whose deposit is held until then.`,
    );
    await expect(bids).not.toContainText(
      "If you win, you owe the winning amount.",
    );
    const text = await page.getByTestId("terms-page").innerText();
    expect(text.match(/7 days/g)).toHaveLength(1);
    expect(text).not.toMatch(NO_DASH);
    await expect(page.getByTestId("terms-product")).toContainText(
      'a Tesla Cybertruck, Cyberbeast trim (the "Beast").',
    );
    await expect(page.getByTestId("terms-product")).toContainText(
      `${BRAND.name} is not affiliated with or endorsed by Tesla, Inc.`,
    );
    const privacy = page.getByTestId("terms-privacy").locator("a");
    await expect(privacy).toHaveText("Privacy policy");
    await expect(privacy).toHaveAttribute("href", "/privacy");
    const paint = await privacy.evaluate((el) => {
      const style = getComputedStyle(el);
      return { color: style.color, line: style.textDecorationLine };
    });
    expect(paint.color).toMatch(/214,\s*255,\s*63|rgb\(214 255 63/);
    expect(paint.line).toContain("underline");
    await expect(page.getByTestId("site-footer")).toBeVisible();
  });

  test("contact form validates before send and places the phone error under the field", async ({
    page,
  }) => {
    let calls = 0;
    await page.route("**/api/waitlist", async (route) => {
      calls += 1;
      await route.abort();
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#contactus");

    const label = page.locator("label[for='waitlist-email']");
    await expect(label).toBeVisible();
    await expect(label).toHaveText("Email");
    await expect(label).not.toHaveClass(/sr-only/);
    const email = page.getByTestId("waitlist-email");
    await expect(email).toHaveAttribute("placeholder", "you@company.com");

    const submit = page.getByTestId("waitlist-submit");
    await submit.click();
    const error = page.getByTestId("waitlist-email-error");
    await expect(error).toHaveText("Enter your email address.");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    expect(calls).toBe(0);

    await email.fill("not-an-email");
    await expect(error).toHaveCount(0);
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
    await submit.click();
    await expect(error).toHaveText("Enter a full email, like you@company.com.");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    expect(calls).toBe(0);

    const inputBox = await box(email);
    const errorBox = await box(error);
    const buttonBox = await box(submit);
    expect(errorBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height - 1);
    expect(buttonBox.y).toBeGreaterThanOrEqual(errorBox.y + errorBox.height - 1);
  });

  test("contact send shows Sending and a plain failure", async ({ page }) => {
    expect(PUBLIC_COPY.waitlist.failed).toBe(SEND_FAILED);
    await page.goto("/#contactus");
    const email = page.getByTestId("waitlist-email");
    const submit = page.getByTestId("waitlist-submit");

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/waitlist", async (route) => {
      await gate;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: "{}",
      });
    });
    await email.fill("you@company.com");
    await submit.click();
    await expect(submit).toHaveText("Sending…");
    release();
    await expect(page.getByTestId("waitlist-email-error")).toHaveText(SEND_FAILED);
    await expect(submit).toHaveText(PUBLIC_COPY.waitlist.button);

    await page.unroute("**/api/waitlist");
    await page.route("**/api/waitlist", (route) => route.abort());
    await email.fill("you@company.com");
    await submit.click();
    await expect(page.getByTestId("waitlist-email-error")).toHaveText(SEND_FAILED);

    await page.unroute("**/api/waitlist");
    await page.route("**/api/waitlist", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: PUBLIC_COPY.waitlist.rateLimited }),
      }),
    );
    await email.fill("you@company.com");
    await submit.click();
    await expect(page.getByTestId("waitlist-email-error")).toHaveText(
      PUBLIC_COPY.waitlist.rateLimited,
    );
  });

  test("bid modal copy, focus trap, and own-seat link", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: OPEN_NOW },
    });
    expect(opened.ok()).toBeTruthy();

    await page.goto("/panels/hood");
    const opener = page.getByTestId("seat-primary-cta");
    await opener.click();
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();
    const amount = page.getByTestId("bid-modal-amount");
    await expect(amount).toBeFocused();
    await expect(page.getByTestId("bid-modal-backdrop")).toHaveAttribute(
      "tabindex",
      "-1",
    );
    await expect(page.getByTestId("bid-modal-seat-link")).toHaveCount(0);

    const deposit = formatUsd(depositUsdForMark(2500));
    const depositLine = `Deposit due now: ${deposit} (${DEPOSIT_PERCENT}% of your bid), charged by Stripe.`;
    expect(depositLine).toBe(
      "Deposit due now: $500 (20% of your bid), charged by Stripe.",
    );
    await expect(page.getByTestId("bid-modal-deposit")).toHaveText(depositLine);
    await expect(page.getByTestId("bid-modal-submit")).toHaveText(
      `Place bid · Pay ${deposit} deposit`,
    );
    await expect(page.getByTestId("bid-modal-artwork")).toHaveText(
      "We review every logo before it goes on the truck.",
    );
    await expect(page.getByTestId("bid-modal-magic")).toHaveText(
      "After your deposit goes through, we email you a link to manage your bid. No password needed.",
    );
    await expect(page.getByTestId("bid-modal-trade-hint")).toHaveText(
      "Your type of business, e.g. Roofing. One brand per trade.",
    );
    await expect(page.locator("label[for='bid-logo']")).toHaveText(
      "Logo (optional, you can send it later)",
    );
    await expect(page.getByTestId("bid-modal-logo")).not.toHaveAttribute(
      "required",
    );
    await expect(modal.locator("dt").first()).toHaveText("Opening price");
    await expect(
      page.locator("[data-testid='bid-modal-panel'] option[value='rear-bumper']"),
    ).toHaveText("Rear Bumper");
    await expect(
      page.locator("[data-testid='bid-modal-panel'] option[value='front-bumper']"),
    ).toHaveText("Front Bumper");

    await amount.fill("2499");
    await expect(page.getByTestId("bid-modal-amount-error")).toHaveText(
      "Minimum bid for this seat is $2,500.",
    );
    await expect(page.getByTestId("bid-modal-deposit")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal-submit")).toHaveText("Place bid");

    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => {
        const dialog = document.querySelector("[data-testid='bid-modal']");
        const active = document.activeElement;
        const backdrop = document.querySelector("[data-testid='bid-modal-backdrop']");
        return Boolean(
          dialog &&
            active &&
            dialog.contains(active) &&
            active !== backdrop,
        );
      });
      expect(inside).toBe(true);
    }
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByTestId("bid-modal-backdrop")).not.toBeFocused();

    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(opener).toBeFocused();

    await page.goto("/");
    await page.getByTestId("panel-link-hood").click();
    await expect(page.getByTestId("bid-modal-seat-link")).toBeVisible();
    await expect(page.getByTestId("auction-today")).toContainText(
      "No bids today yet. Be the first.",
    );
    const modalText = await page.getByTestId("bid-modal").innerText();
    expect(modalText).not.toMatch(NO_DASH);
  });

  test("passenger and driver hit pads keep a gap and a 44px phone height", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    await showView(page, "passenger");
    const sail = await box(page.getByTestId("truck-seat-passenger-rear-quarter"));
    const bed = await box(page.getByTestId("truck-seat-passenger-bed"));
    expect(sail.height).toBeGreaterThanOrEqual(44);
    expect(bed.height).toBeGreaterThanOrEqual(44);
    expect(separation(sail, bed)).toBeGreaterThanOrEqual(8);

    await showView(page, "driver");
    const driverSail = await box(page.getByTestId("truck-seat-driver-rear-quarter"));
    const driverBed = await box(page.getByTestId("truck-seat-driver-bed"));
    expect(driverBed.height).toBeGreaterThanOrEqual(44);
    expect(separation(driverSail, driverBed)).toBeGreaterThanOrEqual(8);

    for (const id of [
      "truck-view-front",
      "truck-view-driver",
      "truck-view-passenger",
      "truck-view-rear",
    ]) {
      const tab = await box(page.getByTestId(id));
      expect(tab.height).toBeGreaterThanOrEqual(44);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await showView(page, "driver");
    const wideSail = await box(page.getByTestId("truck-seat-driver-rear-quarter"));
    const wideBed = await box(page.getByTestId("truck-seat-driver-bed"));
    expect(separation(wideSail, wideBed)).toBeGreaterThanOrEqual(8);
  });

  test("panel page copy, highlight, footer, and bumper display name", async ({
    page,
  }) => {
    expect(PANELS.find((row) => row.id === "rear-bumper")?.name).toBe(
      "Rear bumper",
    );
    expect(PUBLIC_COPY.seat.bumperWrapOnly).toBe(BUMPER_LINE);

    await page.goto("/panels/hood");
    await expect(page).toHaveTitle(`Hood | ${BRAND.name}`);
    expect(await page.title()).not.toMatch(NO_DASH);
    await expect(page.getByTestId("seat-etch-line")).toHaveCount(0);
    await expect(page.getByTestId("seat-lead")).not.toContainText("Immortal Etch");
    await expect(page.getByTestId("seat-lead")).toContainText(
      PUBLIC_COPY.seat.wrapTwelveMonths,
    );
    await expect(page.getByTestId("panel-opening")).toContainText("Opening price");
    await expect(page.getByTestId("panel-opening")).toContainText("$2,500");
    const deposit = page.getByTestId("panel-deposit-shown");
    await expect(deposit).toHaveText(
      `${formatUsd(depositUsdForMark(2500))} (${DEPOSIT_PERCENT}%)`,
    );
    await expect(deposit.locator("xpath=..")).toContainText("Deposit due at bid");
    await expect(page.getByTestId("truck-seat-hood").locator("polygon")).toHaveClass(
      /is-current/,
    );
    await expect(page.getByTestId("truck-seat-dim-front-fascia")).toHaveClass(
      /is-dim/,
    );
    await expect(page.getByTestId("truck-seat-dim-front-bumper")).toHaveClass(
      /is-dim/,
    );
    await expect(page.locator("a[data-testid^='truck-seat-']")).toHaveCount(1);
    const currentFill = await page
      .getByTestId("truck-seat-hood")
      .locator("polygon")
      .evaluate((el) => getComputedStyle(el).fill);
    expect(currentFill).toMatch(/214/);
    const dimFill = await page
      .getByTestId("truck-seat-dim-front-bumper")
      .evaluate((el) => getComputedStyle(el).fill);
    expect(dimFill).not.toMatch(/214/);
    await expect(page.getByTestId("site-footer")).toBeVisible();

    await page.goto("/panels/rear-bumper");
    await expect(page.getByTestId("panel-seat-h1")).toHaveText("11 · Rear Bumper");
    await expect(page).toHaveTitle(`Rear Bumper | ${BRAND.name}`);
    await expect(page.getByTestId("seat-lead")).toHaveText(BUMPER_LINE);
    await expect(page.getByTestId("panel-opening")).toContainText("Opening price");
    await expect(page.getByTestId("site-footer")).toBeVisible();
    const bumperText = await page.locator("body").innerText();
    expect(bumperText).not.toMatch(NO_DASH);
  });

  test("footer links, phone taps, and a pinned leaderboard column", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const x = page.getByTestId("footer-x-link");
    await expect(x).toHaveAttribute("href", "https://x.com/BrandMyBeast");
    await expect(x).toHaveText(BRAND.handle);
    const mail = page.getByTestId("footer-email-link");
    await expect(mail).toHaveAttribute("href", `mailto:${BRAND.email}`);
    await expect(mail).toHaveText(BRAND.email);
    await expect(page.getByTestId("site-footer-line")).toHaveText(
      PUBLIC_COPY.footer.line,
    );
    expect((await box(page.getByTestId("footer-privacy-link"))).height).toBeGreaterThanOrEqual(
      44,
    );
    expect((await box(page.getByTestId("footer-terms-link"))).height).toBeGreaterThanOrEqual(
      44,
    );

    await page.goto("/leaderboard");
    expect(
      (await box(page.locator("header.site-header a[href='/#panels']"))).height,
    ).toBeGreaterThanOrEqual(44);
    expect(
      (await box(page.locator(".leaderboard .eyebrow a"))).height,
    ).toBeGreaterThanOrEqual(44);
    const seePanels = await box(page.getByTestId("leaderboard-panels-link"));
    const lead = await box(page.getByTestId("leaderboard-empty"));
    expect(seePanels.height).toBeGreaterThanOrEqual(44);
    const gap = seePanels.y - (lead.y + lead.height);
    expect(gap).toBeGreaterThanOrEqual(12);
    expect(gap).toBeLessThanOrEqual(24);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/leaderboard");
    const heading = await box(page.locator("main.leaderboard h1"));
    const footerLine = await box(page.getByTestId("site-footer-line"));
    const footer = await box(page.getByTestId("site-footer"));
    expect(Math.abs(heading.x + heading.width / 2 - (footerLine.x + footerLine.width / 2))).toBeLessThan(
      24,
    );
    const scrollHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    expect(scrollHeight).toBeGreaterThanOrEqual(890);
    expect(footer.y + footer.height).toBeGreaterThanOrEqual(scrollHeight - 2);
    const leaderText = await page.locator("body").innerText();
    expect(leaderText).not.toMatch(NO_DASH);
  });
});
