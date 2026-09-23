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
 * Slice 20.8 — wreck lead is a complete sentence, not a fragment.
 * CLOSE_AT null. No Stripe. H1 unchanged.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";
const COMPLETE_LEAD =
  "Here is what happens if the campaign misses, the wrap year ends early, or Immortal Etch is already cut.";
const FRAGMENT =
  "If the campaign misses, the wrap year ends early, or etch is already cut.";

test.describe("slice 20.8: wreck lead is a complete sentence", () => {
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

  test("wreck lead is a complete sentence in PUBLIC_COPY", () => {
    expect(PUBLIC_COPY.wreck.lead).toBe(COMPLETE_LEAD);
    expect(PUBLIC_COPY.wreck.lead).not.toBe(FRAGMENT);
    expect(PUBLIC_COPY.wreck.lead.endsWith(".")).toBe(true);
    expect(/^[A-Z]/.test(PUBLIC_COPY.wreck.lead)).toBe(true);
    expect(PUBLIC_COPY.wreck.lead.toLowerCase()).toMatch(
      /campaign misses|wrap year|etch/,
    );
    const md = readFileSync(join(ROOT, "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(COMPLETE_LEAD);
    expect(md).not.toContain(`\`${FRAGMENT}\``);
  });

  test("homepage wreck lead prints the complete sentence", async ({
    page,
  }) => {
    await page.goto("/#questions");
    await expect(page.getByTestId("wreck-lead")).toHaveCount(0);
    await expect(page.getByTestId("faq-campaign-miss")).toContainText(
      "Every hold is released. Nobody is charged.",
    );
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
