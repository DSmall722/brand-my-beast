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
import { slicesCoversId } from "./helpers/slices-ids";

/**
 * Slice 14.38 — CODEOWNERS or a doc: CAMPAIGN.md, SLICES.md, campaign.ts
 * are human-sensitive. Doc path (not CODEOWNERS) so merges stay unblocked.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();
const DOC = join(ROOT, "docs/HUMAN-SENSITIVE.md");

test.describe("slice 14.38: human-sensitive files doc", () => {
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

  test("docs/HUMAN-SENSITIVE.md names the three paths; no CODEOWNERS", () => {
    expect(existsSync(DOC)).toBe(true);
    expect(existsSync(join(ROOT, "CODEOWNERS"))).toBe(false);
    expect(existsSync(join(ROOT, ".github/CODEOWNERS"))).toBe(false);

    const body = readFileSync(DOC, "utf8");
    expect(body).toContain("14.38");
    expect(body).toContain("CAMPAIGN.md");
    expect(body).toContain("SLICES.md");
    expect(body).toContain("src/lib/campaign.ts");
    expect(body).toContain("$58,000");
    expect(body).toContain("$120,000");
    expect(body).toMatch(/CLOSE_AT/);
    expect(body).toMatch(/human-sensitive/i);
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(body.toLowerCase()).not.toMatch(/@gmail\.com/);

    const slices = readFileSync(join(ROOT, "SLICES.md"), "utf8");
    expect(slicesCoversId("14.38", slices)).toBe(true);
  });
});
