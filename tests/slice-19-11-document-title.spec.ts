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
 * Slice 19.11 — document title and 404 title are BrandMyBeast + locked idea.
 * Drop leftover “advertise on a Cybertruck”. H1 unchanged. CLOSE_AT null.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Put your brand on the truck people already photograph.";
const LOCKED_TITLE = `BrandMyBeast — ${LOCKED_H1}`;

test.describe("slice 19.11: chrome title is BrandMyBeast + locked idea", () => {
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

  test("PUBLIC_COPY title drops advertise leftover and matches md", () => {
    expect(PUBLIC_COPY.meta.title).toBe(LOCKED_TITLE);
    expect(PUBLIC_COPY.meta.title).toContain("BrandMyBeast");
    expect(PUBLIC_COPY.meta.title).toContain(LOCKED_H1);
    expect(PUBLIC_COPY.meta.title).not.toMatch(/advertise on a Cybertruck/i);
    const md = readFileSync(join(ROOT, "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(`\`${LOCKED_TITLE}\``);
    expect(md).not.toMatch(/advertise on a Cybertruck/i);
  });

  test("homepage and 404 document titles use BrandMyBeast + locked idea", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(LOCKED_TITLE);
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    expect(await page.title()).not.toMatch(/advertise on a Cybertruck/i);
    const home = await page.content();
    expect(home).toContain("$58,000");
    expect(home).toContain("$120,000");
    expect(home).not.toContain("FEATURES.md");
    expect(home.toLowerCase()).not.toMatch(/\blease\b/);
    expect(home).not.toMatch(/@gmail\.com/);

    await page.goto("/this-is-not-a-panel-route");
    await expect(page).toHaveTitle(LOCKED_TITLE);
    await expect(page.getByTestId("not-found-title")).toHaveText(
      "This page is not a panel.",
    );
    expect(await page.title()).not.toMatch(/advertise on a Cybertruck/i);
    const missing = await page.content();
    expect(missing).not.toContain("FEATURES.md");
    expect(missing.toLowerCase()).not.toMatch(/\blease\b/);
    expect(missing).not.toMatch(/@gmail\.com/);
  });
});
