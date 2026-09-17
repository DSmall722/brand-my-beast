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
import {
  findCloseAtViolations,
  parseCloseAtAssignment,
} from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";

/**
 * Slice 13.43 — CI fails if CLOSE_AT is non-null.
 * No Stripe. Hold-mode untouched. No Wave 15 wiring.
 */

test.describe("slice 13.43: CI fails if CLOSE_AT is non-null", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("unit: non-null CLOSE_AT assignment is detected; null passes", () => {
    expect(
      parseCloseAtAssignment(
        "export const CLOSE_AT: string | null = null;",
      ),
    ).toEqual({ found: true, rhs: "null", isNullLiteral: true });
    expect(
      parseCloseAtAssignment(
        'export const CLOSE_AT: string | null = "2026-10-01T00:00:00Z";',
      ),
    ).toEqual({
      found: true,
      rhs: '"2026-10-01T00:00:00Z"',
      isNullLiteral: false,
    });
    expect(parseCloseAtAssignment("export const FLOOR_USD = 58000;")).toEqual({
      found: false,
      rhs: null,
      isNullLiteral: false,
    });
    expect(findCloseAtViolations(process.cwd(), null)).toEqual([]);
    expect(
      findCloseAtViolations(process.cwd(), "2026-10-01T00:00:00Z"),
    ).toContain('runtime CLOSE_AT is "2026-10-01T00:00:00Z"');
  });

  test("campaign.ts CLOSE_AT stays null — CI gate", () => {
    expect(findCloseAtViolations()).toEqual([]);
    expect(CLOSE_AT).toBeNull();
  });

  test("homepage still locked — no close date, money fences hold", async ({
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
    expect(html).not.toMatch(/close date/i);
  });
});
