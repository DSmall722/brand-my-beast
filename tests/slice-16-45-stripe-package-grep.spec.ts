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
} from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.45 — CI still fails on `stripe` in package.json.
 * Pins the Playwright workflow step. Does not add Stripe. CLOSE_AT null.
 */

const WORKFLOW = join(process.cwd(), ".github/workflows/playwright.yml");

test.describe("slice 16.45: CI still fails on stripe in package.json", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("workflow runs grep:stripe and a stripe dep would fail CI", () => {
    const workflow = readFileSync(WORKFLOW, "utf8");
    expect(workflow).toContain("npm run grep:stripe");
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
    expect(
      findStripePackageNames({
        dependencies: { stripe: "1.0.0" },
      }),
    ).toEqual(["stripe"]);

    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["grep:stripe"]).toBe(
      "node scripts/grep-stripe-package.mjs",
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
  });
});
