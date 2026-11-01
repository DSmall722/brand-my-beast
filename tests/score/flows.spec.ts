import { expect, test } from "@playwright/test";
import {
  CLOSE_AT,
  FLOOR_USD,
  PANELS,
  formatUsd,
} from "../../src/lib/campaign";
import { PANEL_BOARD_MARKS } from "../../src/lib/panel-board";

const FAQ_CLOSE =
  "Bidding is open and closes Thursday, December 31, 2026 at 12:00 PM ET. A bid in the last 10 minutes pushes the close back 10 minutes.";
const OPEN_NOW = "2026-10-07T16:00:00.000Z";

test.describe("score flows", () => {
  test.afterEach(async ({ request }) => {
    await request.post("/api/test/campaign-clock", { data: { reset: true } });
    await request.post("/api/test/panel-claim", { data: { reset: true } });
  });

  test("home renders all 11 panels", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("panel-grid")).toBeVisible();
    expect(PANELS).toHaveLength(11);
    expect(PANEL_BOARD_MARKS).toHaveLength(11);
    for (const mark of PANEL_BOARD_MARKS) {
      const card = page.getByTestId(`panel-${mark.panelId}`);
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("data-panel-n", String(mark.n));
    }
  });

  test("panel detail page", async ({ page }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    await expect(page.getByTestId("panel-seat-h1")).toBeVisible();
    await expect(page.getByTestId("seat-primary-cta")).toHaveText("Place a bid");
  });

  test("bid form validation", async ({ page, request }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: OPEN_NOW },
    });
    expect(opened.ok()).toBeTruthy();

    await page.goto("/panels/rear-bumper");
    await page.getByTestId("seat-primary-cta").click();
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();

    const brand = page.getByTestId("bid-modal-brand");
    await brand.focus();
    await brand.blur();
    await expect(page.getByTestId("bid-modal-brand-error")).toHaveText(
      "Enter your brand name.",
    );

    await page.getByTestId("bid-modal-amount").fill("1");
    await expect(page.getByTestId("bid-modal-amount-error")).toContainText(
      "Minimum bid",
    );
    await expect(page.getByTestId("bid-modal-submit")).toBeDisabled();
  });

  test("claim form validation", async ({ page, request }) => {
    await request.post("/api/test/panel-claim", { data: { reset: true } });
    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: OPEN_NOW },
    });
    expect(opened.ok()).toBeTruthy();

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-claim-form")).toBeVisible();
    const brand = page.getByTestId("claim-brand");
    const email = page.getByTestId("claim-email");
    await expect(brand).toHaveAttribute("required", "");
    await expect(email).toHaveAttribute("required", "");
    await expect(email).toHaveAttribute("type", "email");
    await page.getByTestId("panel-claim-cta").click();
    const missing = await brand.evaluate(
      (el: HTMLInputElement) => el.validity.valueMissing,
    );
    expect(missing).toBe(true);
  });

  test("FAQ page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("questions-section")).toBeVisible();
    await expect(page.getByTestId("faq-close-date")).toContainText(FAQ_CLOSE);
    await expect(page.getByTestId("faq-outbid")).toBeVisible();
  });

  test("terms page", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByTestId("terms-page")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Terms of Use" }),
    ).toBeVisible();
  });

  test("sign-in page renders", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByTestId("signin-page")).toBeVisible();
    await expect(page.getByTestId("signin-email")).toBeVisible();
    await expect(page.getByTestId("signin-submit")).toBeVisible();
  });

  test("campaign goal and floor show $35,000 and close 2026-12-31 noon ET", async ({
    page,
  }) => {
    expect(FLOOR_USD).toBe(35_000);
    expect(CLOSE_AT).toBe("2026-12-31T17:00:00.000Z");
    expect(formatUsd(FLOOR_USD)).toBe("$35,000");
    await page.goto("/");
    await expect(page.getByTestId("floor-amount")).toHaveText("$35,000");
    await expect(page.getByTestId("faq-close-date")).toContainText(
      "Thursday, December 31, 2026 at 12:00 PM ET",
    );
  });
});
