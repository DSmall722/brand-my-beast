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
 * Slice 16.0a — hide whole-truck sign-in and form from public `/`.
 * Keep buyout cell, vault marks, heading + lead. Waitlist stays.
 * Do not flip SEATS_OPEN. CLOSE_AT null. No Stripe.
 */

const ROOT = process.cwd();

test.describe("slice 16.0a: hide public whole-truck sign-in", () => {
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
    const vercel = JSON.parse(
      readFileSync(join(ROOT, "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: Record<string, boolean> | boolean } };
    const enabled = vercel.git?.deploymentEnabled;
    expect(enabled === false || (typeof enabled === "object" && enabled?.main === true)).toBe(
      true,
    );
  });

  test("SEATS_OPEN is not flipped by this slice", () => {
    const campaign = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(campaign).toMatch(/export const SEATS_OPEN/);
    expect(typeof SEATS_OPEN).toBe("boolean");
  });

  test("HomeMoneySection has no whole-truck form or sign-in CTA", () => {
    const src = readFileSync(
      join(ROOT, "src/components/home/HomeMoneySection.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/from ["']@\/components\/WholeTruckIntentForm["']/);
    expect(src).not.toMatch(/data-testid="whole-truck-signin"/);
    expect(src).not.toMatch(/callbackUrl=\/#money/);
    expect(src).toContain("whole-truck-heading");
    expect(src).toContain("whole-truck-lead");
  });

  test("homepage: no sign-in CTA / form; H1 + Notify me; money fences", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Notify me");
    await expect(page.getByTestId("whole-truck-signin")).toHaveCount(0);
    await expect(page.getByTestId("whole-truck-intent-form")).toHaveCount(0);
    await expect(page.getByTestId("whole-truck-heading")).toHaveText(
      PUBLIC_COPY.board.wholeTruckHeading,
    );
    await expect(page.getByTestId("whole-truck-lead")).toHaveText(
      PUBLIC_COPY.board.wholeTruckLead,
    );
    await expect(page.getByTestId("goal-amount")).toHaveText("$120,000");
    await expect(page.getByTestId("floor-amount")).toHaveText("$58,000");
    await expect(page.getByTestId("visual-vault")).toBeVisible();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toMatch(/\/signin\?callbackUrl=\/#money/);
  });
});
