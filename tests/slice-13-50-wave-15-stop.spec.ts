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
 * Slice 13.50 — Stop line in SLICES: Wave 15 is Stripe and needs a human message.
 * Docs + merge-gate. Does not start Wave 15. CLOSE_AT null. No Stripe.
 */

const DOC = join(process.cwd(), "docs/WAVE-15-STOP.md");
const SLICES = join(process.cwd(), "SLICES.md");

test.describe("slice 13.50: Wave 15 stop line (human only)", () => {
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

  test("WAVE-15-STOP.md and SLICES name the human-only stop", () => {
    expect(existsSync(DOC)).toBe(true);
    const doc = readFileSync(DOC, "utf8");
    expect(doc).toContain("13.50");
    expect(doc).toMatch(/Wave 15 is Stripe and needs a human message/i);
    expect(doc).toMatch(/Do not start Wave 15/i);
    expect(doc).toMatch(/Do not wire Stripe/i);
    expect(doc).toMatch(/Do not set `CLOSE_AT`|Do not set CLOSE_AT/i);
    expect(doc).toMatch(/\$58,000/);
    expect(doc).toMatch(/\$120,000/);
    expect(doc).toMatch(/CLOSE_AT.*=.*\*\*null\*\*|CLOSE_AT.*null/i);
    expect(doc).toMatch(/No lease|no lease/i);
    expect(doc.toLowerCase()).not.toContain("gmail.com");
    expect(doc.toLowerCase()).not.toContain("stripe setupintent");

    const slices = readFileSync(SLICES, "utf8");
    expect(slices).toMatch(/## Wave 15 —/);
    expect(slices).toMatch(/Wave 15 is Stripe and needs a human message/i);
    expect(slices).toMatch(/Do not start Wave 15/i);
    expect(slices).toMatch(/13\.50/);
    expect(slices).toMatch(/docs\/WAVE-15-STOP\.md/);
    // No agent-startable Wave 15 checkboxes
    expect(slices).not.toMatch(/^- \[[ xX]\] 15\.\d+/m);
  });
});
