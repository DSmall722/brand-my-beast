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
 * Slice 16.42 — prove-all.sh includes 16.4, 16.5, 16.28.
 * CLOSE_AT null. No Stripe. Does not flip SEATS_OPEN.
 */

const PROVE_ALL = join(
  process.cwd(),
  ".cursor/skills/verify-brandmybeast/scripts/prove-all.sh",
);

const REQUIRED_SPECS = [
  "tests/slice-16-4-callout-wordmark.spec.ts",
  "tests/slice-16-5-twelve-numbers-dom.spec.ts",
  "tests/slice-16-28-card-callout-nav.spec.ts",
] as const;

const REQUIRED_SLICE_IDS = ["16.4", "16.5", "16.28"] as const;

test.describe("slice 16.42: prove-all includes 16.4, 16.5, 16.28", () => {
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

  test("prove-all.sh lists 16.4, 16.5, and 16.28", () => {
    expect(existsSync(PROVE_ALL)).toBe(true);
    const body = readFileSync(PROVE_ALL, "utf8");
    expect(body).toContain("PROVE_ALL_PLAYWRIGHT_SPECS");
    expect(body).toContain("npx playwright test");
    expect(body).toContain("16.42");
    for (const id of REQUIRED_SLICE_IDS) {
      expect(body).toContain(id);
    }
    for (const spec of REQUIRED_SPECS) {
      expect(body).toContain(spec);
      expect(existsSync(join(process.cwd(), spec))).toBe(true);
    }
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(body).not.toMatch(/stripe/i);
    expect(body).not.toContain("CLOSE_AT=");
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
