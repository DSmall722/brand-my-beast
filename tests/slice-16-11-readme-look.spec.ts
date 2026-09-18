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
 * Slice 16.11 — README “How to look at this” points at 16.8.
 * Not brandmybeast.com as the demo.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

const README = join(process.cwd(), "README.md");
const LOCKED =
  "`npm i && npm run dev` is how friends see the real page while Vercel is on hold.";

function howToLook(text: string): string {
  const start = text.indexOf("## How to look at this");
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start);
  const next = rest.indexOf("\n## ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

test.describe("slice 16.11: README how to look points at 16.8", () => {
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

  test("How to look at this points at LOCAL-PREVIEW, not the live domain", () => {
    const text = readFileSync(README, "utf8");
    const section = howToLook(text);
    expect(section).toContain("docs/LOCAL-PREVIEW.md");
    expect(section).toContain("16.8");
    expect(section).toContain(LOCKED);
    expect(section).toContain("Not brandmybeast.com as the demo.");
    expect(section).not.toMatch(/https:\/\/brandmybeast\.com/);
    expect(section.toLowerCase()).not.toMatch(/\blease\b/);
    expect(section).not.toMatch(/@gmail\.com/i);
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/CLOSE_AT/);
  });
});
