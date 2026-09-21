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
import { PUBLIC_COPY, wholeTruckPackageCopy } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 20.7 — homepage whole-truck lead is one sentence.
 * The 12-name package dump stays off `/`. CLOSE_AT null. No Stripe.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Put your brand on the truck people already photograph.";
const ONE_SENTENCE =
  "One brand on every panel and Immortal Etch on nine steel faces. Standing panel winners released. Nothing is charged on this page.";

test.describe("slice 20.7: whole-truck lead is one sentence", () => {
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

  test("PUBLIC_COPY whole-truck lead is one sentence", () => {
    expect(PUBLIC_COPY.board.wholeTruckLead).toBe(ONE_SENTENCE);
    expect(PUBLIC_COPY.board.wholeTruckLead.endsWith(".")).toBe(true);
    expect(PUBLIC_COPY.board.wholeTruckLead).toContain("Immortal Etch");
    expect(PUBLIC_COPY.board.wholeTruckLead).not.toContain("1 Hood");
    expect(wholeTruckPackageCopy()).toMatch(/^The package is 1 Hood/);
    const md = readFileSync(join(ROOT, "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(ONE_SENTENCE);
    expect(md).not.toContain("The package is 1 Hood");
  });

  test("homepage whole-truck block drops the 12-name dump", async ({
    page,
  }) => {
    await page.goto("/#money");
    await expect(page.getByTestId("whole-truck-lead")).toHaveText(
      PUBLIC_COPY.board.wholeTruckLead,
    );
    await expect(page.getByTestId("whole-truck-lead")).not.toContainText(
      "1 Hood",
    );
    await expect(page.getByTestId("whole-truck-heading")).toHaveText(
      "Whole truck — $120,000",
    );
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    const html = await page.content();
    expect(html).not.toContain("The package is 1 Hood");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
