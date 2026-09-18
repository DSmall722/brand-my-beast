import { readFileSync } from "node:fs";
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
 * Slice 16.8 — docs/LOCAL-PREVIEW.md: npm i && npm run dev while Vercel is on hold.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

const DOC = join(process.cwd(), "docs/LOCAL-PREVIEW.md");

test.describe("slice 16.8: local preview doc", () => {
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
  });

  test("LOCAL-PREVIEW says npm i && npm run dev while Vercel is on hold", () => {
    const doc = readFileSync(DOC, "utf8");
    expect(doc).toContain(
      "`npm i && npm run dev` is how friends see the real page while Vercel is on hold.",
    );
    expect(doc).toContain("npm i && npm run dev");
    expect(doc).toContain("$58,000");
    expect(doc).toContain("$120,000");
    expect(doc).toContain("CLOSE_AT");
    expect(doc.toLowerCase()).not.toMatch(/\blease\b/);
    expect(doc).not.toMatch(/@gmail\.com/i);
    expect(doc).not.toContain("teslacyberbeast");
  });
});
