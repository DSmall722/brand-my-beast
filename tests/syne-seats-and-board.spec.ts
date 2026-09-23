import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";

test.describe("Syne lockup, board marks, seat lead", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("How it works shows three guest steps side by side", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("#story .story-step-title")).toHaveText([
      "Pick a Panel",
      "Place a Bid",
      "Get on the Truck",
    ]);
    await expect(page.locator("#story .story-step-copy")).toHaveText([
      "Choose from 11 different available high visibility advertising spaces.",
      "Lock your bid to the board with a 20% down payment, processed securely through Stripe.",
      "When the campaign ends, winning brands will have their approved ad printed on high quality vinyl wrap and proudly displayed on the truck for 12 full months.",
    ]);
    await expect(page.locator("#story")).not.toContainText(
      "$58,000 or the money comes back",
    );
    await expect(page.locator("#story")).not.toContainText(
      "$120,000 unlocks Immortal Etch",
    );
    await expect(page.locator("#story .immortal-etch")).toHaveCount(0);
    await expect(page.getByTestId("story-etch-forever")).toHaveCount(0);
    const stepTops = await page.locator("#story .story-list > li").evaluateAll(
      (items) => items.map((item) => Math.round(item.getBoundingClientRect().top)),
    );
    expect(stepTops).toHaveLength(3);
    expect(new Set(stepTops).size).toBe(1);
    const fonts = await page.evaluate(() => {
      const lockup = document.querySelector("#etch .immortal-etch");
      const title = document.querySelector("#story .story-step-title");
      const copy = document.querySelector("#story .story-step-copy");
      if (!lockup || !title || !copy) return null;
      return {
        lockup: getComputedStyle(lockup).fontFamily,
        title: getComputedStyle(title).fontFamily,
        copy: getComputedStyle(copy).fontFamily,
      };
    });
    expect(fonts).not.toBeNull();
    expect(fonts!.lockup.toLowerCase()).toMatch(/syne/);
    expect(fonts!.title.toLowerCase()).not.toMatch(/syne/);
    expect(fonts!.copy.toLowerCase()).not.toMatch(/syne/);
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
  });

  test("hero is the house-wrap concept with numbers on the board", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("truck-img-hero")).toBeVisible();
    await expect(page.getByTestId("hero-preview-label")).toHaveCount(0);
    await expect(page.locator(".hero-lead")).toHaveCount(0);
    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);
    for (let n = 1; n <= 11; n += 1) {
      await expect(page.getByTestId(`hero-panel-board-${n}`)).toHaveCount(0);
      await expect(page.getByTestId(`panel-legend-${n}`)).toBeVisible();
    }
    await expect(page.getByTestId("view-panel-board-driver")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-baked-marks",
      "true",
    );
  });

  test("hood and fascia seat leads use Immortal Etch; bumpers stay wrap-only", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    await page.goto("/panels/hood");
    const hood = page.getByTestId("seat-lead");
    await expect(hood).toContainText(PUBLIC_COPY.seat.wrapTwelveMonths);
    await expect(hood).toContainText("Immortal Etch Locked");
    await expect(hood).not.toContainText("Current Bid");
    await expect(hood).not.toContainText("Etchable only");
    await expect(page.getByTestId("seat-finish")).toHaveAttribute(
      "data-etchable",
      "true",
    );
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("FEATURES.md");

    await page.goto("/panels/front-fascia");
    const fascia = page.getByTestId("seat-lead");
    await expect(fascia).toContainText(PUBLIC_COPY.seat.wrapTwelveMonths);
    await expect(fascia).toContainText("Immortal Etch Locked");
    await expect(fascia).not.toContainText("forever");
    await expect(page.getByTestId("seat-finish")).toHaveAttribute(
      "data-etchable",
      "true",
    );

    await page.goto("/panels/front-bumper");
    const bumper = page.getByTestId("seat-lead");
    await expect(bumper).toHaveText(PUBLIC_COPY.seat.bumperWrapOnly);
    await expect(bumper).not.toContainText("Current Bid");
    await expect(page.getByTestId("seat-finish")).toHaveAttribute(
      "data-etchable",
      "false",
    );
  });
});
