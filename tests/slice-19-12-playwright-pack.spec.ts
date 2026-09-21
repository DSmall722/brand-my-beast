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
 * Slice 19.12 — Wave 19 Playwright pack.
 * H1 locked. Notify me. No hometown / sign-in-to-list on hood.
 * No lease. $58,000 / $120,000 stay. CLOSE_AT null. No Stripe.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";
const HOMETOWN_LABELS = ["Charlotte", "Atlanta", "Panhandle"] as const;

test.describe("slice 19.12: Wave 19 Playwright pack", () => {
  test.describe.configure({ mode: "serial" });

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

  test("homepage H1, Notify me, money, and no lease", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("hood has no hometown cities and no sign-in-to-list while closed", async ({
    page,
    request,
  }) => {
    const closed = await request.post("/api/test/seats-open", {
      data: { open: false },
    });
    expect(closed.ok()).toBeTruthy();
    const closedBody = (await closed.json()) as { seatsOpen?: boolean };
    expect(closedBody.seatsOpen).toBe(false);

    try {
      await page.goto("/panels/hood");
      await expect(page.getByTestId("panel-intent-page")).toBeVisible();
      await expect(page.getByTestId("hometown-lane")).toHaveCount(0);
      await expect(page.getByTestId("intent-signin-needed")).toHaveCount(0);
      await expect(page.getByTestId("intent-bid-form")).toHaveCount(0);

      const visible = await page.locator("body").innerText();
      expect(visible).not.toContain("Sign in to list an intent");
      expect(visible).not.toMatch(/\bSC\b/);
      for (const label of HOMETOWN_LABELS) {
        expect(visible).not.toContain(label);
      }

      const html = await page.content();
      expect(html).toContain("$58,000");
      expect(html).toContain("$120,000");
      expect(html).not.toContain("FEATURES.md");
      expect(html.toLowerCase()).not.toMatch(/\blease\b/);
      expect(html).not.toMatch(/@gmail\.com/);
    } finally {
      await request.post("/api/test/seats-open", { data: { reset: true } });
    }
  });
});
