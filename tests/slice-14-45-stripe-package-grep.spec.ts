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
import {
  findStripePackageNames,
  findStripePackagesInRootPackageJson,
  packageNameLooksLikeStripe,
  readRootPackageJson,
} from "../src/lib/no-stripe-package";

/**
 * Slice 14.45 — CI grep: fail on stripe in package.json.
 * Pins grep:stripe. Reuses 13.42 dependency-name scan.
 * CLOSE_AT null. Hold-mode untouched. No Wave 15 wiring.
 */

const ROOT = process.cwd();

test.describe("slice 14.45: CI grep fail on stripe in package.json", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(ROOT, "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("unit: stripe package names are detected; unrelated deps are not", () => {
    expect(packageNameLooksLikeStripe("stripe")).toBe(true);
    expect(packageNameLooksLikeStripe("@stripe/stripe-js")).toBe(true);
    expect(packageNameLooksLikeStripe("next")).toBe(false);
    expect(
      findStripePackageNames({
        dependencies: { next: "16.3.5", stripe: "^17.0.0" },
        devDependencies: { "@stripe/react-stripe-js": "^2.0.0" },
      }),
    ).toEqual(["stripe", "@stripe/react-stripe-js"]);
  });

  test("CI grep: root package.json has zero stripe dependencies", () => {
    const pkg = readRootPackageJson();
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
    expect(findStripePackageNames(pkg)).toEqual([]);
  });

  test("package.json grep:stripe script is pinned", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["grep:stripe"]).toBe(
      "node scripts/grep-stripe-package.mjs",
    );
  });

  test("homepage still locked — no lease, money fences, public mail only", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("hello@brandmybeast.com");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });
});
