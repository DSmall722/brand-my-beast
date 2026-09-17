import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";

/**
 * Slice 14.5 — CAMPAIGN.md current-stack sentence matches ARCHITECTURE.
 * Numbers unchanged. CLOSE_AT null. No Stripe. No clock.
 */

const CAMPAIGN = join(process.cwd(), "CAMPAIGN.md");
const ARCH = join(process.cwd(), "ARCHITECTURE.md");

test.describe("slice 14.5: CAMPAIGN current-stack matches ARCHITECTURE", () => {
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
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("CAMPAIGN stack sentence matches ARCHITECTURE; money numbers unchanged", () => {
    expect(existsSync(CAMPAIGN)).toBe(true);
    expect(existsSync(ARCH)).toBe(true);
    const campaign = readFileSync(CAMPAIGN, "utf8");
    const arch = readFileSync(ARCH, "utf8");

    expect(campaign).toContain("14.5");
    expect(campaign).toMatch(/### Current stack/);
    expect(campaign).toMatch(/ARCHITECTURE\.md/);
    expect(campaign).toMatch(/Next\.js App Router/);
    expect(campaign).toMatch(/Postgres/);
    expect(campaign).toMatch(/Blob/);
    expect(campaign).toMatch(/Resend/);
    expect(campaign).toMatch(/Stripe is \*\*not wired\*\*/);
    expect(campaign).toMatch(/CLOSE_AT[`\s]*stays null/);
    expect(campaign).toMatch(/Do not start the 30-day clock/);

    // Money table still the only thresholds — unchanged.
    expect(campaign).toContain("$58,000");
    expect(campaign).toContain("$120,000");
    expect(campaign).toMatch(/## Money \(locked 2026-09-13\)/);
    expect(campaign.toLowerCase()).not.toContain("gmail.com");

    // ARCHITECTURE still names the same layers.
    expect(arch).toMatch(/Postgres/i);
    expect(arch).toMatch(/Blob/i);
    expect(arch).toMatch(/Resend/i);
    expect(arch).toMatch(/not wired/i);
    expect(arch).toMatch(/Next\.js/);
  });
});
