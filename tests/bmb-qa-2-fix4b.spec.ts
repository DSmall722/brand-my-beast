import { expect, test, type Page } from "@playwright/test";
import { BRAND, formatUsd } from "../src/lib/campaign";
import { MAX_CLIENT_BID_USD } from "../src/components/home/BidDesk";

const OPEN_NOW = "2026-10-06T16:00:00.000Z";
const MAX_LINE = `Bids above ${formatUsd(MAX_CLIENT_BID_USD)} need a call. Email ${BRAND.email}.`;
const WIN_LINE =
  "If you win, pay the rest of your winning bid within 7 days. Your deposit counts toward it. If you don't pay in time, the deposit is forfeited and the seat goes to the next-highest bidder, whose deposit is held until then.";
const HOLD_LINE = "your deposit is held until the winner pays";

async function expectDescribed(
  page: Page,
  fieldTestId: string,
  errorTestId: string,
  message: string,
) {
  const field = page.getByTestId(fieldTestId);
  const error = page.getByTestId(errorTestId);
  await expect(error).toHaveText(message);
  await expect(error).toHaveAttribute("aria-live", "polite");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  const describedBy = await field.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(error).toHaveAttribute("id", describedBy ?? "");
}

test.describe("BMB-QA-2-FIX4 retest", () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ request }) => {
    await request.post("/api/test/campaign-clock", { data: { reset: true } });
  });

  test("auction headings stay uppercase Syne and the phone caption is 12px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const caption = page.getByTestId("hero-caption");
    await expect(caption).toHaveText("Example wrap. Your brand here.");
    await expect(caption).toHaveCSS("font-size", "12px");

    const heading = page.locator(".auction-live h3").first();
    await expect(heading).toHaveCSS("text-transform", "uppercase");
    const family = await heading.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toContain("Syne");

    await page.setViewportSize({ width: 1280, height: 800 });
    const desktopPx = await caption.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(desktopPx).toBeGreaterThanOrEqual(12);
  });

  test("bid errors wait for touch or submit, including the client max", async ({
    page,
    request,
  }) => {
    expect(MAX_CLIENT_BID_USD).toBe(100_000);
    expect(MAX_LINE).toBe(
      "Bids above $100,000 need a call. Email hello@brandmybeast.com.",
    );

    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: OPEN_NOW },
    });
    expect(opened.ok()).toBeTruthy();

    await page.goto("/panels/hood");
    await page.getByTestId("seat-primary-cta").click();
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();

    const brand = page.getByTestId("bid-modal-brand");
    const trade = page.getByTestId("bid-modal-trade");
    const email = page.getByTestId("bid-modal-email");
    const amount = page.getByTestId("bid-modal-amount");
    const submit = page.getByTestId("bid-modal-submit");
    const brandError = page.getByTestId("bid-modal-brand-error");
    const tradeError = page.getByTestId("bid-modal-trade-error");
    const emailError = page.getByTestId("bid-modal-email-error");
    const amountError = page.getByTestId("bid-modal-amount-error");

    await expect(brandError).toHaveCount(0);
    await expect(tradeError).toHaveCount(0);
    await expect(emailError).toHaveCount(0);
    await expect(amountError).toHaveCount(0);
    await expect(brand).not.toHaveAttribute("aria-invalid", "true");
    await expect(trade).not.toHaveAttribute("aria-invalid", "true");
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
    await expect(amount).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("bid-modal-deposit")).toBeVisible();

    await brand.focus();
    await brand.blur();
    await expectDescribed(page, "bid-modal-brand", "bid-modal-brand-error", "Enter your brand name.");
    await expect(tradeError).toHaveCount(0);
    await expect(emailError).toHaveCount(0);

    await amount.focus();
    await amount.press("Enter");
    await expectDescribed(
      page,
      "bid-modal-trade",
      "bid-modal-trade-error",
      "Enter your trade, e.g. Roofing.",
    );
    await expectDescribed(
      page,
      "bid-modal-email",
      "bid-modal-email-error",
      "Enter a full email, like you@company.com.",
    );

    await trade.fill("A");
    await expect(tradeError).toHaveText("Enter your trade, e.g. Roofing.");
    await brand.fill("Acme Roofing");
    await trade.fill("Roofing");
    await email.fill("not-an-email");
    await expect(emailError).toHaveText("Enter a full email, like you@company.com.");
    await email.fill("you@company.com");
    await expect(brandError).toHaveCount(0);
    await expect(tradeError).toHaveCount(0);
    await expect(emailError).toHaveCount(0);
    await expect(submit).toBeEnabled();

    await amount.fill("2499");
    await expectDescribed(
      page,
      "bid-modal-amount",
      "bid-modal-amount-error",
      "Minimum bid for this seat is $2,500.",
    );
    await expect(page.getByTestId("bid-modal-deposit")).toHaveCount(0);
    await expect(submit).toBeDisabled();

    await amount.fill("12.5");
    await expectDescribed(
      page,
      "bid-modal-amount",
      "bid-modal-amount-error",
      "Enter a bid in whole dollars.",
    );
    await expect(page.getByTestId("bid-modal-deposit")).toHaveCount(0);

    await amount.fill("100001");
    await expectDescribed(page, "bid-modal-amount", "bid-modal-amount-error", MAX_LINE);
    await expect(page.getByTestId("bid-modal-deposit")).toHaveCount(0);
    await expect(submit).toBeDisabled();
  });

  test("share alt drops buyout and the OG image is a png", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const alt =
      (await page.locator('meta[property="og:image:alt"]').getAttribute("content")) ??
      "";
    expect(alt.toLowerCase()).not.toContain("uyout");
    expect(alt).not.toContain("$120,000");
    expect(alt).not.toMatch(/\u2014|\u2013/);

    const og = await request.get("/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"] ?? "").toMatch(/image\/png/i);
    expect((await og.body()).byteLength).toBeGreaterThan(1000);
  });

  test("terms state the 7 day rule once inside the merged win sentence", async ({
    page,
  }) => {
    await page.goto("/terms");
    const text = await page.getByTestId("terms-page").innerText();
    expect(text.match(/7 days/g)).toEqual(["7 days"]);
    expect(text).not.toMatch(/7-day/);
    expect(text).not.toContain(HOLD_LINE);
    expect(text).toContain(WIN_LINE);
  });

  test("own seat page does not offer View this seat", async ({ page, request }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: OPEN_NOW },
    });
    expect(opened.ok()).toBeTruthy();

    await page.goto("/panels/hood");
    await page.getByTestId("seat-primary-cta").click();
    await expect(page.getByTestId("bid-modal")).toBeVisible();
    await expect(page.getByTestId("bid-modal-seat-link")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal")).not.toContainText("View this seat");
  });
});
