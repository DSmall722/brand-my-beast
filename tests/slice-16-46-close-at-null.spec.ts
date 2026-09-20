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
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.46 — CI still fails if CLOSE_AT is non-null.
 * Pins the Playwright workflow step. Does not set CLOSE_AT. No Stripe.
 */

const WORKFLOW = join(process.cwd(), ".github/workflows/playwright.yml");

test.describe("slice 16.46: CI still fails if CLOSE_AT is non-null", () => {
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

  test("workflow runs grep:close-at and a non-null assignment would fail", () => {
    const workflow = readFileSync(WORKFLOW, "utf8");
    expect(workflow).toContain("npm run grep:close-at");
    expect(
      parseCloseAtAssignment("export const CLOSE_AT: string | null = null;"),
    ).toMatchObject({ isNullLiteral: true });
    expect(
      parseCloseAtAssignment(
        'export const CLOSE_AT: string | null = "2026-10-01T00:00:00.000Z";',
      ).isNullLiteral,
    ).toBe(false);

    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["grep:close-at"]).toBe(
      "node scripts/grep-close-at.mjs",
    );
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });
});
