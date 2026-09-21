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
 * Slice 20.9 — meta description is waitlist-era.
 * No “Bid on a panel” while seats are closed. H1 unchanged.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Put your brand on the truck people already photograph.";
const WAITLIST_DESCRIPTION =
  "Eleven companies. One Cyberbeast. Join the list. Hit $58,000 and the truck is ordered and wrapped for a year. Miss it and nobody pays.";

test.describe("slice 20.9: waitlist-era meta description", () => {
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

  test("PUBLIC_COPY meta description is waitlist-era", () => {
    expect(PUBLIC_COPY.meta.description).toBe(WAITLIST_DESCRIPTION);
    expect(PUBLIC_COPY.meta.description).not.toMatch(/Bid on a panel/i);
    expect(PUBLIC_COPY.hero.h1).toBe(LOCKED_H1);
    const md = readFileSync(join(ROOT, "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(WAITLIST_DESCRIPTION);
    expect(md).not.toContain("Bid on a panel");
  });

  test("homepage meta description has no Bid on a panel", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(PUBLIC_COPY.meta.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      PUBLIC_COPY.meta.description,
    );
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    const html = await page.content();
    expect(html).not.toContain("Bid on a panel");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
