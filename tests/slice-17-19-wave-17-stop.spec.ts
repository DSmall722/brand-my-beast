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
 * Slice 17.19 — after 17.18, idle on this wave.
 * Wave 15 is still Stripe and needs a human message. Do not start it.
 */

const DOC = join(process.cwd(), "docs/WAVE-15-STOP.md");

test.describe("slice 17.19: idle after 17.18; Wave 15 still human", () => {
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

  test("stop doc idles after 17.18 and keeps earlier stop lines", () => {
    const doc = readFileSync(DOC, "utf8");
    expect(doc).toContain("17.19");
    expect(doc).toContain("After 17.18, idle on this wave");
    expect(doc).toMatch(/Wave 15 is still Stripe and needs a human message/);
    expect(doc).toMatch(/Do not start Wave 15/);
    expect(doc).toContain("After 17.10 continue 17.12");
    expect(doc).toMatch(/16\.50/);
    expect(doc).toMatch(/\$58,000/);
    expect(doc).toMatch(/\$120,000/);
    expect(doc).not.toMatch(/gmail\.com/i);
  });
});
