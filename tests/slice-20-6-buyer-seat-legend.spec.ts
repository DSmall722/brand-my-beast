import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  SEATS_OPEN,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 20.6 — board legend is a buyer sentence from PUBLIC_COPY.
 * Drops Open seat · Held = standing intent. CLOSE_AT null. No Stripe.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";
const BUYER_LEGEND =
  "Open seat = empty. Held seat = standing intent.";

test.describe("slice 20.6: buyer seat legend sentence", () => {
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("SEATS_OPEN is not flipped in campaign.ts", () => {
    const src = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(src).toMatch(/export const SEATS_OPEN/);
    expect(src).toMatch(/export const CLOSE_AT:\s*string\s*\|\s*null\s*=\s*null/);
    expect(process.env.SEATS_OPEN ?? "").not.toMatch(/^(false|0)$/i);
    expect(SEATS_OPEN).toBe(true);
  });

  test("PUBLIC_COPY seat legend is the buyer sentence", () => {
    expect(PUBLIC_COPY.board.seatLegend).toBe(BUYER_LEGEND);
    const md = readFileSync(join(ROOT, "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(BUYER_LEGEND);
    expect(md).not.toContain("Open seat · Held = standing intent");
  });

  test("homepage legend uses the buyer sentence, not Held =", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("truck-view-legend")).toHaveCount(0);
    const empty = page.getByTestId("truck-seat-hood");
    await expect(empty).toBeVisible();
    await expect(empty).toHaveAttribute("aria-label", /open seat$/);
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await page.goto("/panels/hood");
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "aria-label",
      /(open|held) seat$/,
    );
    const html = await page.content();
    expect(html).not.toContain("Open seat · Held = standing intent");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
