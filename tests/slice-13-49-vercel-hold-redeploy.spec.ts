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
 * Slice 13.49 — Slice 11.10 remains human: one-line runbook
 * “redeploy when Vercel hold lifts.” Leave vercel.json hold-mode alone.
 * CLOSE_AT null. No Stripe.
 */

const NOTE = join(process.cwd(), "docs/VERCEL-HOLD.md");

test.describe("slice 13.49: 11.10 remains human redeploy runbook", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
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

  test("VERCEL-HOLD.md one-line human runbook cites 13.49 / 11.10", () => {
    expect(existsSync(NOTE)).toBe(true);
    const text = readFileSync(NOTE, "utf8");
    expect(text).toContain("13.49");
    expect(text).toContain("11.10");
    expect(text).toMatch(/remains human/i);
    expect(text).toMatch(/One-line runbook \(human\)/i);
    expect(text).toMatch(
      /Redeploy when the hold lifts/i,
    );
    expect(text).toMatch(/redeploy when the Vercel hold lifts/i);
    expect(text).toMatch(/Agents do not clear the hold/i);
    expect(text).toMatch(/Leave hold-mode alone/i);
    expect(text).toMatch(/No app change/i);
    expect(text).toMatch(/No Stripe/i);
    expect(text).toMatch(/Auction clock stays unset|close clock/i);
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).not.toContain("CLOSE_AT=");
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
  });
});
