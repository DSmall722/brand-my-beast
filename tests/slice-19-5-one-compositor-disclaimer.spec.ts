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
import { etchLockCopy } from "../src/lib/etch-lock";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { STAINLESS_COMPOSITOR_LEAD } from "../src/lib/stainless-compositor";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 19.5 — one disclaimer on the seat compositor.
 * Floor / buyout are not stamped on every caption.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";

test.describe("slice 19.5: one compositor disclaimer", () => {
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

  test("unit: lead holds the money; captions do not", () => {
    expect(STAINLESS_COMPOSITOR_LEAD).toContain("$58,000");
    expect(STAINLESS_COMPOSITOR_LEAD).toContain("$120,000");
    expect(etchLockCopy(0)).not.toContain("$58,000");
    expect(etchLockCopy(0)).not.toContain("$120,000");
    expect(etchLockCopy(GOAL_USD)).not.toContain("$120,000");
    expect(PUBLIC_COPY.compositor.finishEtch).not.toContain("$120,000");
    expect(PUBLIC_COPY.compositor.finishWrapEtchable).not.toContain("$58,000");
    expect(PUBLIC_COPY.compositor.finishWrapEtchable).not.toContain("$120,000");
  });

  test("hood compositor stamps floor/buyout once on the lead", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    const lead = page.getByTestId("stainless-compositor-lead");
    await expect(lead).toContainText("$58,000");
    await expect(lead).toContainText("$120,000");
    await expect(page.getByTestId("etch-lock-copy")).not.toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("etch-lock-copy")).not.toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("compositor-finish-label")).toHaveCount(0);
    await expect(page.getByTestId("compositor-finish-label")).toHaveCount(0);
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("homepage H1 is unchanged and Notify me stays", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("features.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
