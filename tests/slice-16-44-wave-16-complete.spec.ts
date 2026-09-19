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
 * Slice 16.44 — Tag `wave-16-complete` after 16.43. No clock.
 * Docs only. Does not set CLOSE_AT. Does not add Stripe. Does not flip SEATS_OPEN.
 */

const DOC = join(process.cwd(), "docs/WAVE-16-COMPLETE.md");
const PRIOR = join(process.cwd(), "docs/WAVE-14-COMPLETE.md");
const CAMPAIGN_TS = join(process.cwd(), "src/lib/campaign.ts");

test.describe("slice 16.44: wave-16-complete tag after 16.43 (no clock)", () => {
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

  test("WAVE-16-COMPLETE.md follows 16.43 and forbids a clock", () => {
    expect(existsSync(DOC)).toBe(true);
    expect(existsSync(PRIOR)).toBe(true);
    const text = readFileSync(DOC, "utf8");
    expect(text).toContain("16.44");
    expect(text).toContain("16.43");
    expect(text).toContain("wave-16-complete");
    expect(text).toContain("wave-14-complete");
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text).toMatch(/CLOSE_AT.*null|remains \*\*null\*\*/i);
    expect(text).toMatch(/does \*\*not\*\* start the 30-day clock|no clock/i);
    expect(text).toMatch(/No lease|no lease/i);
    expect(text).toMatch(/No Stripe|no Stripe/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).toMatch(/git tag -a wave-16-complete/);

    const campaign = readFileSync(CAMPAIGN_TS, "utf8");
    expect(campaign).toMatch(/CLOSE_AT[\s\S]*?=\s*null/);
    expect(campaign).not.toMatch(/from ["']stripe["']/);
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
