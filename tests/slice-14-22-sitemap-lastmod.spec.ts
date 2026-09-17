import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import {
  gitHeadLastModified,
  gitLastModified,
} from "../src/lib/git-lastmod";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";

/**
 * Slice 14.22 — Sitemap lastmod from git time, not a fake clock.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

function gitIso(pathOrHead: string): string {
  const args =
    pathOrHead === "HEAD"
      ? ["log", "-1", "--format=%cI", "HEAD"]
      : ["log", "-1", "--format=%cI", "--", pathOrHead];
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

test.describe("slice 14.22: sitemap lastmod from git time", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
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

  test("gitLastModified matches git log committer time", () => {
    const pageIso = gitIso("src/app/page.tsx");
    const fromHelper = gitLastModified("src/app/page.tsx");
    expect(fromHelper).not.toBeNull();
    expect(fromHelper!.toISOString()).toBe(new Date(pageIso).toISOString());

    const headIso = gitIso("HEAD");
    const head = gitHeadLastModified();
    expect(head).not.toBeNull();
    expect(head!.toISOString()).toBe(new Date(headIso).toISOString());

    // Not a wall-clock "now" fake — must be in the past relative to this test.
    expect(fromHelper!.getTime()).toBeLessThan(Date.now());
  });

  test("sitemap.ts wires git lastmod — no Date.now() lastModified", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/sitemap.ts"),
      "utf8",
    );
    expect(src).toContain("gitLastModified");
    expect(src).toContain("lastModified");
    expect(src).not.toMatch(/lastModified:\s*new Date\(\)/);
    // Ban wall-clock lastmod in code (comments may say the words).
    expect(src).not.toMatch(/lastModified:\s*new Date\(Date\.now\(\)\)/);
    expect(src).not.toMatch(/lastModified:\s*new Date\(\s*\)/);
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("sitemap.xml emits <lastmod> from git, not a fake clock", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain(`<loc>https://${BRAND.domain}</loc>`);
    for (const panel of PANELS) {
      expect(body).toContain(
        `<loc>https://${BRAND.domain}/panels/${panel.id}</loc>`,
      );
    }

    const lastmods = [...body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(
      (m) => m[1]!,
    );
    expect(lastmods.length).toBeGreaterThanOrEqual(1 + PANELS.length);

    const homeIso = gitIso("src/app/page.tsx");
    const homeDay = new Date(homeIso).toISOString().slice(0, 10);
    expect(lastmods.some((v) => v.startsWith(homeDay))).toBe(true);

    // No CLOSE_AT / clock / lease leakage in the XML.
    expect(body).not.toMatch(/CLOSE_AT/);
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(body.toLowerCase()).not.toMatch(/stripe/);
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
