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
 * Slice 14.23 — Favicon 32/180 only if missing.
 * Both sizes already shipped in 6.10 (favicon.ico 32×32, apple-icon 180×180).
 * This slice proves they stay; do not invent duplicates. CLOSE_AT null.
 * No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();
const FAVICON = join(ROOT, "src/app/favicon.ico");
const ICON_SVG = join(ROOT, "src/app/icon.svg");
const APPLE = join(ROOT, "src/app/apple-icon.tsx");

/** ICO type-1 entry: width/height bytes at offset 6/7 (0 means 256). */
function icoFirstSize(buf: Buffer): { width: number; height: number } {
  expect(buf.readUInt16LE(0)).toBe(0); // reserved
  expect(buf.readUInt16LE(2)).toBe(1); // type = icon
  expect(buf.readUInt16LE(4)).toBeGreaterThanOrEqual(1); // count
  const w = buf.readUInt8(6);
  const h = buf.readUInt8(7);
  return { width: w === 0 ? 256 : w, height: h === 0 ? 256 : h };
}

test.describe("slice 14.23: favicon 32/180 only if missing", () => {
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
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("32×32 favicon.ico and 180×180 apple-icon already present — skip inventing", () => {
    expect(existsSync(FAVICON)).toBe(true);
    expect(existsSync(ICON_SVG)).toBe(true);
    expect(existsSync(APPLE)).toBe(true);

    const ico = readFileSync(FAVICON);
    const size = icoFirstSize(ico);
    expect(size.width).toBe(32);
    expect(size.height).toBe(32);

    const svg = readFileSync(ICON_SVG, "utf8");
    expect(svg).toMatch(/viewBox="0 0 32 32"/);
    expect(svg).toContain("BrandMyBeast");
    expect(svg.toLowerCase()).not.toMatch(/\blease\b/);

    const appleSrc = readFileSync(APPLE, "utf8");
    expect(appleSrc).toMatch(/width:\s*180/);
    expect(appleSrc).toMatch(/height:\s*180/);
    expect(appleSrc).toContain("BrandMyBeast");
    expect(appleSrc.toLowerCase()).not.toMatch(/\blease\b/);

    // Do not invent a parallel icon.tsx when 32 is already covered.
    expect(existsSync(join(ROOT, "src/app/icon.tsx"))).toBe(false);
  });

  test("GET /favicon.ico is 32 and /apple-icon is 180 PNG", async ({
    request,
  }) => {
    const favicon = await request.get("/favicon.ico");
    expect(favicon.ok()).toBeTruthy();
    const favBody = Buffer.from(await favicon.body());
    expect(favBody.byteLength).toBeGreaterThan(32);
    const size = icoFirstSize(favBody);
    expect(size.width).toBe(32);
    expect(size.height).toBe(32);

    const apple = await request.get("/apple-icon");
    expect(apple.ok()).toBeTruthy();
    expect(apple.headers()["content-type"] ?? "").toMatch(/image\/png/i);
    const png = Buffer.from(await apple.body());
    expect(png.byteLength).toBeGreaterThan(800);
    // PNG IHDR width/height at bytes 16–23
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(png.readUInt32BE(16)).toBe(180);
    expect(png.readUInt32BE(20)).toBe(180);
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
