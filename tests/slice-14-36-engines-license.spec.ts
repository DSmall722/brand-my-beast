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
 * Slice 14.36 — engines + license in package.json if 12.48 did not land.
 * 12.48 already landed (#205). This slice re-locks the same fields.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();

type Pkg = {
  license?: string;
  engines?: { node?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

test.describe("slice 14.36: engines + license (12.48 already landed)", () => {
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

  test("package.json keeps license + engines.node from 12.48", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as Pkg;
    expect(pkg.license).toBe("UNLICENSED");
    expect(pkg.engines?.node).toMatch(/22/);

    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );

    const slices = readFileSync(join(ROOT, "SLICES.md"), "utf8");
    expect(slices).toMatch(/\[x\] 12\.48.*license.*engines/);
    expect(slices).toMatch(/14\.36/);

    const pkgText = readFileSync(join(ROOT, "package.json"), "utf8");
    expect(pkgText.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
