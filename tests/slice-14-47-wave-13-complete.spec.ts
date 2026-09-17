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
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.47 — Tag `wave-13-complete` after 13.50. No clock.
 * Docs + merge-gate; does not set CLOSE_AT. Does not add Stripe.
 */

const DOC = join(process.cwd(), "docs/WAVE-13-COMPLETE.md");
const WAVE15_STOP = join(process.cwd(), "docs/WAVE-15-STOP.md");
const CAMPAIGN_TS = join(process.cwd(), "src/lib/campaign.ts");

test.describe("slice 14.47: wave-13-complete tag (no CLOSE_AT / Stripe)", () => {
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

  test("WAVE-13-COMPLETE.md names the tag and forbids clock / Stripe", () => {
    expect(existsSync(DOC)).toBe(true);
    expect(existsSync(WAVE15_STOP)).toBe(true);
    const text = readFileSync(DOC, "utf8");
    expect(text).toContain("14.47");
    expect(text).toContain("13.50");
    expect(text).toContain("wave-13-complete");
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text).toMatch(/CLOSE_AT.*null|remains \*\*null\*\*/i);
    expect(text).toMatch(
      /does \*\*not\*\* start the 30-day clock|Still no clock|no clock/i,
    );
    expect(text).toMatch(/No lease|no lease/i);
    expect(text).toMatch(/No Stripe|no Stripe/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
    expect(text).toMatch(/git tag -a wave-13-complete/);

    const campaign = readFileSync(CAMPAIGN_TS, "utf8");
    expect(campaign).toMatch(/CLOSE_AT[\s\S]*?=\s*null/);
    expect(campaign).not.toMatch(/from ["']stripe["']/);
  });
});
