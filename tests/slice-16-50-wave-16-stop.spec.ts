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
 * Slice 16.50 — after Wave 16, idle. Wave 15 still needs a human message.
 * Does not start Wave 15. CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

const DOC = join(process.cwd(), "docs/WAVE-15-STOP.md");
const CAMPAIGN_TS = join(process.cwd(), "src/lib/campaign.ts");

test.describe("slice 16.50: Wave 16 stop — Wave 15 still human", () => {
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

  test("WAVE-15-STOP.md restates idle after Wave 16", () => {
    expect(existsSync(DOC)).toBe(true);
    const doc = readFileSync(DOC, "utf8");
    expect(doc).toContain("16.50");
    expect(doc).toMatch(/After Wave 16, idle/i);
    expect(doc).toMatch(/Wave 15 is still Stripe and needs a human message/i);
    expect(doc).toMatch(/Do not start Wave 15/i);
    expect(doc).toMatch(/Do not wire Stripe/i);
    expect(doc).toMatch(/\$58,000/);
    expect(doc).toMatch(/\$120,000/);
    expect(doc).toMatch(/CLOSE_AT.*null/i);
    expect(doc.toLowerCase()).not.toContain("gmail.com");

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
