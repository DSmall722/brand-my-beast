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
 * Slice 19.2 — hometown off. Remove HometownLaneTags from public seats.
 * No SC / Charlotte / Atlanta / Panhandle on /panels/*. CLOSE_AT null.
 * No Stripe. Do not flip SEATS_OPEN. Homepage H1 unchanged.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Put your brand on the truck people already photograph.";
const HOMETOWN_LABELS = ["SC", "Charlotte", "Atlanta", "Panhandle"] as const;

test.describe("slice 19.2: hometown off public seats", () => {
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

  test("public seats have no hometown lane or circuit city labels", async ({
    page,
  }) => {
    for (const id of ["hood", "driver-door"] as const) {
      await page.goto(`/panels/${id}`);
      await expect(page.getByTestId("panel-intent-page")).toBeVisible();
      await expect(page.getByTestId("hometown-lane")).toHaveCount(0);
      await expect(page.getByTestId("hometown-lane-sc")).toHaveCount(0);
      await expect(page.getByTestId("hometown-lane-charlotte")).toHaveCount(0);
      await expect(page.getByTestId("hometown-lane-atlanta")).toHaveCount(0);
      await expect(page.getByTestId("hometown-lane-panhandle")).toHaveCount(0);

      const visible = await page.locator("body").innerText();
      expect(visible).not.toMatch(/\bSC\b/);
      expect(visible).not.toContain("Charlotte");
      expect(visible).not.toContain("Atlanta");
      expect(visible).not.toContain("Panhandle");
      expect(visible).not.toContain("Hometown lane");
      for (const label of HOMETOWN_LABELS) {
        expect(visible).not.toContain(label);
      }

      const html = await page.content();
      expect(html).toContain("$58,000");
      expect(html).toContain("$120,000");
      expect(html).not.toContain("FEATURES.md");
      expect(html.toLowerCase()).not.toMatch(/\blease\b/);
      expect(html).not.toMatch(/@gmail\.com/);
    }
  });

  test("homepage H1 is unchanged and Notify me stays", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
    const html = (await page.content()).toLowerCase();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("features.md");
  });
});
