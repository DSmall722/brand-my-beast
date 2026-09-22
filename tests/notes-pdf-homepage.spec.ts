import { expect, test } from "@playwright/test";
import { PANELS, currentBidUsd, formatUsd, isEtchable } from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { TRUCK_VIEWS } from "../src/lib/truck-views";

const ETCH_UNLOCK =
  "Once total active bids cross $120,000, buyers will unlock the option to have their advertisement permanently etched on the stainless surface for 3x the final bid for that panel.";
const ETCH_STEEL =
  "Immortal Etch is only available on stainless steel panels.";

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

    const heroPanel = page.getByTestId("hero-primary-cta");
    await expect(heroPanel.locator(".obsidian-arrow-fill-btn__text")).toHaveText(
      "Bid on a Panel",
    );
    await expect(heroPanel).toHaveJSProperty("tagName", "BUTTON");
    await expect(heroPanel).toHaveClass(/obsidian-arrow-fill-btn/);
    const heroContact = page.getByTestId("hero-secondary-cta");
    await expect(heroContact).toHaveText("Contact BMB");
    await expect(heroContact).toHaveAttribute("href", "#waitlist");
    await expect(heroContact).toHaveClass(/btn-panel/);
    await expect(heroContact).not.toHaveClass(/obsidian-arrow-fill-btn/);
    await expect(
      page.locator('.site-header a.nav-link[href="#waitlist"]'),
    ).toHaveText("Contact BMB");
    await expect(page.getByTestId("signin-link")).toHaveCount(0);
    await expect(page.locator("#panels-title")).toHaveText("Bid on a Panel");
    await expect(page.locator("#truck-views-title")).toHaveText(
      "Preview the Panels",
    );
    await expect(page.getByTestId("truck-view-lead")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-legend")).toHaveCount(0);
    expect(TRUCK_VIEWS.map((row) => row.id)).toEqual([
      "front",
      "driver",
      "passenger",
      "rear",
    ]);
    await expect(page.getByTestId("truck-view-credit-edit")).toHaveText(
      "Edited with Higgsfield.ai and Grok Image",
    );
    await expect(page.getByTestId("truck-view-credit-link")).toBeVisible();

    await expect(page.locator("#money-title")).toHaveText("Track the Auction");
    await expect(page.getByTestId("floor-hint")).toHaveText(
      "Miss the floor and every bid is refunded.",
    );
    await expect(page.locator("#money .money-cell").nth(1).locator(".label")).toHaveText(
      "Floor",
    );
    await expect(page.locator("#money .money-cell").nth(1).locator(".label")).not.toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("floor-amount")).toHaveText("$58,000");
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
      "Buy the Whole Truck",
    );
    await expect(page.getByTestId("vault-goal-label")).toHaveCount(0);
    await expect(page.getByTestId("goal-progress-copy")).toHaveText(
      "0% of campaign fully funded",
    );
    await expect(page.getByTestId("floor-progress-copy")).toHaveText("0% of floor");
    const floorMarker = await page.getByTestId("vault-marker-floor").boundingBox();
    const floorLabel = await page.getByTestId("vault-floor-label").boundingBox();
    if (!floorMarker || !floorLabel) {
      throw new Error("floor marker or label missing");
    }
    const markerCenter = floorMarker.x + floorMarker.width / 2;
    const labelCenter = floorLabel.x + floorLabel.width / 2;
    expect(Math.abs(markerCenter - labelCenter)).toBeLessThan(12);
    await expect(page.getByTestId("panels-lead")).toHaveText(
      "Select a panel below for more details.",
    );
    await expect(page.getByTestId("panels-lead")).not.toContainText(ETCH_UNLOCK);
    await expect(page.getByTestId("etch-unlock")).toContainText(ETCH_UNLOCK);
    await expect(page.getByTestId("etch-unlock")).toContainText(ETCH_STEEL);
    await expect(page.getByTestId("etch-unlock").locator(".immortal-etch")).toHaveText(
      "Immortal Etch",
    );
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
    expect(doorSize.trim()).toBe("150% auto");
    const hoodSize = await page
      .getByTestId("panel-face-hood")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--panel-face-size"));
    expect(hoodSize.trim()).toBe("cover");
    const rearSize = await page
      .getByTestId("panel-face-tailgate")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--panel-face-size"));
    expect(rearSize.trim()).toBe("175% auto");

    // Sail + bed cards center aft panels (not doors).
    await expect(page.getByTestId("panel-face-driver-rear-quarter")).toHaveAttribute(
      "data-face-pos",
      "74% 34%",
    );
    await expect(page.getByTestId("panel-face-driver-bed")).toHaveAttribute(
      "data-face-pos",
      "88% 58%",
    );
    await expect(page.getByTestId("panel-face-passenger-rear-quarter")).toHaveAttribute(
      "data-face-pos",
      "0% 44%",
    );
    await expect(page.getByTestId("panel-face-passenger-bed")).toHaveAttribute(
      "data-face-pos",
      "2% 50%",
    );
    const sailSize = await page
      .getByTestId("panel-face-passenger-rear-quarter")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--panel-face-size"));
    expect(sailSize.trim()).toBe("360% auto");
    const bedSize = await page
      .getByTestId("panel-face-passenger-bed")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--panel-face-size"));
    expect(bedSize.trim()).toBe("380% auto");

    await expect(page.locator("#story")).toContainText(
      "Maximum of one brand for each kind of business. If someone in your trade is already standing, highest bidder wins.",
    );
    await expect(page.locator("#story .story-step-title").nth(2)).toHaveText(
      "$120,000 unlocks Immortal Etch",
    );
    await expect(page.locator("#story .story-step-title .immortal-etch")).toHaveCount(0);
    await expect(page.locator("#story .story-step-copy .immortal-etch")).toHaveText(
      "Immortal Etch",
    );
    await expect(page.locator("#story")).toContainText(
      "Vinyl wrap lasts for one year,",
    );
    await expect(page.locator("#story")).toContainText(
      "but with Immortal Etch, your ad lasts FOREVER.",
    );
    await expect(page.getByTestId("story-etch-forever")).toHaveCount(0);
    await expect(page.locator("#etch-title")).toHaveText("Immortal Etch");
    await expect(page.locator("#etch-title")).not.toHaveClass(/immortal-etch/);

    await expect(page.getByTestId("etch-sample-slots")).toBeVisible();
    const etchSamples = [
      ["hood", "/etch-sample-hood.jpg", "Immortal Etch sample, front", 1280, 861],
      ["door", "/etch-sample-door.jpg", "Immortal Etch sample, side", 1280, 853],
      ["tailgate", "/etch-sample-tailgate.jpg", "Immortal Etch sample, rear", 1280, 861],
    ] as const;
    for (const [id, src, alt, width, height] of etchSamples) {
      const img = page.getByTestId(`etch-sample-${id}`).locator("img");
      await expect(img).toBeVisible();
      await expect(img).toHaveAttribute("src", src);
      await expect(img).toHaveAttribute("alt", alt);
      await expect(img).toHaveJSProperty("naturalWidth", width);
      await expect(img).toHaveJSProperty("naturalHeight", height);
    }
    await expect(page.getByTestId("etch-section")).not.toContainText(
      "Wrap is a year of film",
    );
    await expect(page.getByTestId("wreck-refund-faq")).toHaveCount(0);
    await expect(page.getByTestId("faq-campaign-miss")).toContainText(
      "Full refund",
    );
    await expect(page.locator("#questions")).not.toContainText(
      "When does bidding start?",
    );
    await expect(page.locator("#questions")).not.toContainText(
      "Will I be charged",
    );
    await expect(page.locator("#questions")).not.toContainText(
      "Is there a truck yet?",
    );
    await expect(page.locator("#questions")).not.toContainText(
      "Why is Immortal Etch locked until $120k",
    );
    await expect(page.locator("#questions")).not.toContainText(
      "What if Immortal Etch is already installed",
    );

    await expect(page.locator("#questions-title")).toHaveText("FAQ");
    await expect(page.locator("#money")).not.toContainText(
      "Amount is intent only. When bidding opens, a 20% deposit holds your panel.",
    );
    await expect(page.getByTestId("hero-preview-label")).toHaveCount(0);
    await expect(page.locator(".hero-lead")).toHaveCount(0);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);

    await expect(page.locator("#waitlist-title")).toHaveText("Contact Us");
    await expect(page.locator("#waitlist")).not.toContainText(
      "Seats are not for sale yet",
    );
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
    await expect(page.locator("#waitlist")).not.toContainText(
      "We only email when seats open.",
    );
    await expect(page.getByTestId("site-footer-independent")).toHaveCount(0);
    await expect(page.getByTestId("footer-privacy-link")).toHaveAttribute(
      "href",
      "/privacy",
    );
    await expect(page.getByTestId("footer-terms-link")).toHaveAttribute(
      "href",
      "/terms",
    );

    await page.getByTestId("want-all-panels").click();
    await expect(page).toHaveURL(/#waitlist$/);
    await expect(page.getByTestId("waitlist-want-whole-truck")).toBeChecked();

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("Higglesfield");
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
    await expect(page.getByTestId("seat-lead")).not.toContainText("Current Bid");
    await expect(page.getByTestId("panel-standing")).toContainText(
      formatUsd(2750),
    );

    await page.goto("/");
    await expect(page.getByTestId("panel-current-bid-hood")).toHaveText(
      "Current Bid $2,750",
    );
    await expect(page.getByTestId("panel-current-bid-front-bumper")).toHaveText(
      "Current Bid $500",
    );
  });

  test("seat pages use wrap strings and clear sticky overlays", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("truck-view-front").click();
    await page.getByTestId("truck-seat-hood").click();
    await expect(page).toHaveURL(/\/panels\/hood/);
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-polygons",
      "hidden",
    );
    await expect(page.getByTestId("seat-lead")).toContainText(
      PUBLIC_COPY.seat.wrapTwelveMonths,
    );
    await expect(page.getByTestId("seat-lead")).toContainText(
      "Immortal Etch Locked",
    );
    await expect(page.getByTestId("seat-lead")).not.toContainText("Current Bid");
    await expect(page.getByTestId("panel-mockup")).toHaveCount(0);
    await expect(page.getByTestId("stainless-compositor-lead")).toHaveCount(0);
    await expect(page.getByTestId("etch-lock-copy")).toHaveCount(0);
    await expect(page.getByTestId("compositor-finish-label")).toHaveCount(0);
    await expect(page.getByTestId("compositor-wrap-film")).toHaveCount(0);

    await page.goto("/panels/front-bumper");
    await expect(page.getByTestId("seat-lead")).toHaveText(
      PUBLIC_COPY.seat.bumperWrapOnly,
    );
    await expect(page.getByTestId("seat-lead")).not.toContainText("Current Bid");

    for (const panel of PANELS.filter((row) => isEtchable(row)).slice(0, 2)) {
      await page.goto(`/panels/${panel.id}`);
      await expect(page.getByTestId("seat-wrap-line")).toHaveText(
        PUBLIC_COPY.seat.wrapTwelveMonths,
      );
    }
  });
});
