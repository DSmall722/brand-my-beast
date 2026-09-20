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
 * Slice 14.50 — Stop line: Wave 15 is Stripe / CLOSE_AT / first tweet
 * and needs a human message. Does not start Wave 15. CLOSE_AT null.
 */

const DOC = join(process.cwd(), "docs/WAVE-15-STOP.md");
const SLICES = join(process.cwd(), "SLICES.md");
const CAMPAIGN_TS = join(process.cwd(), "src/lib/campaign.ts");

test.describe("slice 14.50: Wave 15 stop line after Wave 14", () => {
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

  test("WAVE-15-STOP.md cites 14.50 and forbids Stripe / CLOSE_AT / tweet", () => {
    expect(existsSync(DOC)).toBe(true);
    const doc = readFileSync(DOC, "utf8");
    expect(doc).toContain("14.50");
    expect(doc).toContain("13.50");
    expect(doc).toMatch(/Wave 15 is Stripe/i);
    expect(doc).toMatch(/needs a human message/i);
    expect(doc).toMatch(/Do not start Wave 15/i);
    expect(doc).toMatch(/Do not wire Stripe/i);
    expect(doc).toMatch(/Do not set `CLOSE_AT`|Do not set CLOSE_AT/i);
    expect(doc).toMatch(/Do not tweet|@BrandMyBeast/i);
    expect(doc).toMatch(/first tweet|First campaign tweet/i);
    expect(doc).toMatch(/\$58,000/);
    expect(doc).toMatch(/\$120,000/);
    expect(doc).toMatch(/CLOSE_AT.*=.*\*\*null\*\*|CLOSE_AT.*null/i);
    expect(doc).toMatch(/No lease|no lease/i);
    expect(doc).toMatch(/Wave \*\*16\*\*|Wave 16/i);
    expect(doc.toLowerCase()).not.toContain("gmail.com");
    expect(doc.toLowerCase()).not.toContain("stripe setupintent");

    const campaign = readFileSync(CAMPAIGN_TS, "utf8");
    expect(campaign).toMatch(/CLOSE_AT[\s\S]*?=\s*null/);
    expect(campaign).not.toMatch(/from ["']stripe["']/);
  });

  test("SLICES Wave 15 stays human-only; 14.50 complete; no 15.x boxes", () => {
    const slices = readFileSync(SLICES, "utf8");
    expect(slices).toMatch(/Wave 15 is Stripe/i);
    expect(slices).toMatch(/Do not start Wave 15|waits for an explicit human message/i);
    expect(slices).toMatch(/14\.50/);
    expect(slices).toMatch(/docs\/WAVE-15-STOP\.md|Wave 15 is Stripe STOP/i);
    // Condensed Waves 0–15 line or explicit 14.50 checkbox.
    expect(slices).toMatch(/0\.1–14\.50 Complete|^- \[x\] 14\.50\b/m);
    expect(slices).not.toMatch(/^- \[[ xX]\] 15\.\d+/m);
    // After 14.50, Now advances into Wave 16, then 17, then 18. Never Wave 15.
    expect(slices).toMatch(/\*\*Now:\*\*\s*(16\.|17\.|18\.)/);
    expect(slices).not.toMatch(/\*\*Now:\*\*\s*15\./);
  });
});
