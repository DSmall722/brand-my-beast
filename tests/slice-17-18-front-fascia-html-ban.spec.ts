import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { depositUsdForMark } from "../src/lib/intent";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 17.18 — /panels/front-fascia HTML drops prototype jargon.
 * Opening stays $2,000. Deposit stays 20% of opening, not charged.
 * CLOSE_AT null. No Stripe package.
 */

const BANNED = [
  "prototype",
  "30X",
  "hotspot",
  "shader",
  "reserved VIN",
  "Stripe",
] as const;

test.describe("slice 17.18: front fascia HTML drops prototype jargon", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
    expect(DEPOSIT_PERCENT).toBe(20);
    expect(formatUsd(depositUsdForMark(2_000))).toBe("$400");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("front fascia HTML keeps money and drops banned words", async ({
    page,
  }) => {
    await page.goto("/panels/front-fascia");
    await expect(page.getByTestId("panel-seat-h1")).toContainText("Front Fascia");
    const deposit = page.getByTestId("panel-deposit-shown");
    await expect(deposit).toContainText(`${DEPOSIT_PERCENT}%`);
    await expect(deposit).toContainText("not charged");
    const open = await page
      .getByTestId("panel-stats")
      .getAttribute("data-seat-open");
    if (open === "true") {
      await expect(deposit).toContainText(formatUsd(depositUsdForMark(2_000)));
    }
    const html = await page.content();
    for (const word of BANNED) {
      expect(html, word).not.toContain(word);
    }
    expect(html).toContain("$2,000");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
