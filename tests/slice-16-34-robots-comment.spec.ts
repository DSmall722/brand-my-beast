import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { ROBOTS_DISALLOW_PATHS, ROBOTS_HOLD_COMMENT } from "../src/app/robots";
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
 * Slice 16.34 — robots.txt comment that production may be stale while
 * the Vercel hold is on. Allow / disallow rules do not change.
 */

test.describe("slice 16.34: robots.txt hold comment", () => {
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

  test("robots.txt keeps crawl rules and adds the hold comment", async ({
    request,
  }) => {
    const src = readFileSync(join(process.cwd(), "src/app/robots.ts"), "utf8");
    expect(src).toContain(ROBOTS_HOLD_COMMENT);
    expect(ROBOTS_DISALLOW_PATHS).toEqual([
      "/account",
      "/account/",
      "/signin",
      "/signin/",
      "/operator",
      "/operator/",
    ]);

    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain(ROBOTS_HOLD_COMMENT);
    expect(body).toMatch(/^# production may be stale while Vercel hold is on\./m);
    expect(body).toMatch(/Allow:\s*\/\b/);
    expect(body).toMatch(/Allow:\s*\/panels\//);
    expect(body).toMatch(/Disallow:\s*\/account/);
    expect(body).toMatch(/Disallow:\s*\/signin/);
    expect(body).toMatch(/Disallow:\s*\/operator/);
    expect(body).toContain("https://brandmybeast.com/sitemap.xml");
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(body).not.toContain("CLOSE_AT");
    expect(body).not.toMatch(/stripe/i);
  });
});
