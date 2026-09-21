import { expect, test } from "@playwright/test";
import { PANELS, currentBidUsd, formatUsd } from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

const ETCH_LINE =
  "If total active bids cross $120,000, buyers will unlock the option to have their advertisement permanently etched on the stainless surface for 3x the final bid for that panel. Immortal Etch is only available on stainless steel panels.";

test.describe("notes PDF homepage sheet", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("current bid is the opening until a real bid exists", () => {
    expect(currentBidUsd(2500, null)).toBe(2500);
    expect(currentBidUsd(2500, undefined)).toBe(2500);
    expect(currentBidUsd(2500, 0)).toBe(2500);
    expect(currentBidUsd(2500, 2750)).toBe(2750);
  });

  test("homepage matches the sheet", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("hero-secondary-cta")).toHaveText(
      "Bid on a Panel",
    );
    await expect(page.getByTestId("hero-secondary-cta")).toHaveClass(/btn-panel/);
    await expect(page.locator("#truck-views-title")).toHaveText(
      "Preview the Panels",
    );
    await expect(page.getByTestId("truck-view-lead")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-legend")).toHaveCount(0);

    await expect(page.locator("#money-title")).toHaveText("Track the Auction");
    await expect(page.getByTestId("floor-hint")).toHaveText(
      "Miss the floor and every bid is refunded.",
    );
    await expect(page.getByTestId("goal-amount")).toHaveText("$120,000");
    await expect(page.locator("#money")).toContainText("Unlock Immortal Etch");
    await expect(page.locator("#money")).not.toContainText("No marks yet");
    await expect(page.locator("#money")).not.toContainText(
      "Bidding is not open",
    );
    await expect(page.locator("#money")).not.toContainText("No seats sold yet");
    await expect(page.getByTestId("open-seats")).toHaveText(
      `11 of ${PANELS.length}`,
    );

    await expect(page.getByTestId("want-all-panels")).toHaveText(
      "Want to buy all the panels?",
    );
    await expect(page.getByTestId("panels-lead")).toContainText(
      "Purchase a Highly Visible Vinyl Advertising Wrap for 12 Months.",
    );
    await expect(page.getByTestId("panels-lead")).toContainText(ETCH_LINE);
    await expect(page.getByTestId("panels-lead")).not.toContainText(
      "Eleven seats. Opening prices below.",
    );
    await expect(page.getByTestId("panel-open-seat-once")).toHaveCount(0);
    await expect(page.getByTestId("panel-front-fascia")).toContainText(
      "Front Fascia",
    );
    await expect(page.getByTestId("panel-front-fascia")).not.toContainText(
      "stainless",
    );
    await expect(page.getByTestId("panel-driver-door")).toContainText(
      "Driver Side Doors",
    );
    await expect(page.getByTestId("panel-driver-bed")).toContainText(
      "Driver Side Bed",
    );
    await expect(page.getByTestId("panel-passenger-door")).toContainText(
      "Passenger Side Doors",
    );
    await expect(page.getByTestId("panel-passenger-bed")).toContainText(
      "Passenger Side Bed",
    );
    await expect(page.getByTestId("panel-driver-rear-quarter")).toContainText(
      "Driver Rear Sail",
    );
    await expect(page.getByTestId("etch-lock-hood")).toHaveText(
      "Immortal Etch Locked",
    );
    await expect(page.getByTestId("panel-front-bumper")).not.toContainText(
      "simple-mark",
    );
    await expect(page.getByTestId("panel-current-bid-hood")).toHaveText(
      "Current Bid $2,500",
    );

    const doorSize = await page
      .getByTestId("panel-face-driver-door")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--panel-face-size"));
    expect(doorSize.trim()).toBe("320% auto");
    const hoodSize = await page
      .getByTestId("panel-face-hood")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--panel-face-size"));
    expect(hoodSize.trim()).toBe("cover");

    await expect(page.locator("#story")).toContainText(
      "Maximum of one brand for each kind of business. If someone in your trade is already standing, highest bidder wins.",
    );
    await expect(page.locator("#story")).toContainText(
      "$120,000 Immortal Etch Unlocked",
    );
    await expect(page.locator("#story")).not.toContainText(
      "At $120,000 you get every panel and the campaign owns the truck.",
    );
    await expect(page.getByTestId("story-etch-forever")).toHaveText(
      PUBLIC_COPY.howItWorks.foreverLine,
    );

    await expect(page.getByTestId("etch-sample-slots")).toBeVisible();
    await expect(page.getByTestId("etch-sample-hood")).toBeVisible();
    await expect(page.getByTestId("etch-section")).not.toContainText(
      "Wrap is a year of film",
    );
    await expect(page.getByTestId("wreck-refund-faq")).toHaveCount(0);
    await expect(page.getByTestId("faq-campaign-miss")).toContainText(
      "Full refund",
    );

    await expect(page.locator("#waitlist-title")).toHaveText("Contact Us");
    await expect(page.locator("#waitlist")).not.toContainText(
      "Seats are not for sale yet",
    );
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
    await expect(page.locator("#waitlist")).not.toContainText(
      "We only email when seats open.",
    );
    await expect(page.getByTestId("site-footer-independent")).toHaveCount(0);

    await page.getByTestId("want-all-panels").click();
    await expect(page).toHaveURL(/#waitlist$/);
    await expect(page.getByTestId("waitlist-want-whole-truck")).toBeChecked();

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("FEATURES.md");
  });

  test("a real bid replaces the opening on the card", async ({ page }) => {
    await page.goto("/signin");
    await page.getByTestId("signin-email").fill("notes-pdf-bid@example.com");
    await page.getByTestId("signin-password").fill("test");
    await page.getByTestId("signin-submit").click();
    await expect(page.getByTestId("account-page")).toBeVisible();

    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Notes Pdf Co");
    await page.getByTestId("intent-trade").fill("notes snacks");
    await page.getByTestId("intent-standing").fill("2750");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText("not charged", {
      timeout: 10_000,
    });
    await expect(page.getByTestId("seat-lead")).toContainText(
      `Current Bid ${formatUsd(2750)}`,
    );

    await page.goto("/");
    await expect(page.getByTestId("panel-current-bid-hood")).toHaveText(
      "Current Bid $2,750",
    );
    await expect(page.getByTestId("panel-current-bid-front-bumper")).toHaveText(
      "Current Bid $500",
    );
  });
});
