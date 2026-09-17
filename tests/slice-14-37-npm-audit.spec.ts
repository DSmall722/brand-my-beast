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

/**
 * Slice 14.37 — Pinned `npm audit` script. No new runtime.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();

type Pkg = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

test.describe("slice 14.37: pinned npm audit script", () => {
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
    const vercel = JSON.parse(
      readFileSync(join(ROOT, "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("package.json audit script is pinned to --audit-level=high", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as Pkg;
    expect(pkg.scripts?.audit).toBe("npm audit --audit-level=high");
    expect(pkg.scripts?.audit).toContain("--audit-level=high");
    expect(pkg.scripts?.audit).not.toMatch(/audit-level=moderate|audit-level=low/);

    // No new runtime deps from this slice.
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
    expect(deps).not.toContain("npm-audit-resolver");
    expect(deps).not.toContain("better-npm-audit");

    const slices = readFileSync(join(ROOT, "SLICES.md"), "utf8");
    expect(slices).toMatch(/14\.37.*npm audit/);
  });
});
