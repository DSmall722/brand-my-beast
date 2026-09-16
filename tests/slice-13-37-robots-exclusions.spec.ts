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
import { ROBOTS_DISALLOW_PATHS } from "../src/app/robots";

/**
 * Slice 13.37 — robots.txt still excludes /account, /signin, /operator.
 * Builds on 7.8. CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

test.describe("slice 13.37: robots.txt excludes account signin operator", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("unit: disallow list covers account, signin, operator", () => {
    expect(ROBOTS_DISALLOW_PATHS).toEqual([
      "/account",
      "/account/",
      "/signin",
      "/signin/",
      "/operator",
      "/operator/",
    ]);
    const src = readFileSync(join(process.cwd(), "src/app/robots.ts"), "utf8");
    expect(src).toContain("ROBOTS_DISALLOW_PATHS");
    expect(src).toContain('"/account"');
    expect(src).toContain('"/signin"');
    expect(src).toContain('"/operator"');
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("robots.txt disallows /account, /signin, /operator", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toMatch(/Allow:\s*\/\b/);
    expect(body).toMatch(/Allow:\s*\/panels\//);
    expect(body).toMatch(/Disallow:\s*\/account/);
    expect(body).toMatch(/Disallow:\s*\/signin/);
    expect(body).toMatch(/Disallow:\s*\/operator/);
    expect(body).toContain("https://brandmybeast.com/sitemap.xml");
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(body).not.toContain("CLOSE_AT");
    expect(body).not.toMatch(/stripe/i);

    const home = await request.get("/");
    expect(home.ok()).toBeTruthy();
    const html = await home.text();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
