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
import { HERO_STILL_WIDE } from "../src/lib/hero-still";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.32 — OG image for `/` is the homepage hero still, photo only.
 * CLOSE_AT null. No Stripe.
 */

const OG_SRC = join(process.cwd(), "src/app/opengraph-image.tsx");

function pngSize(body: Buffer): { width: number; height: number } {
  expect(body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(body.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return {
    width: body.readUInt32BE(16),
    height: body.readUInt32BE(20),
  };
}

test.describe("slice 16.32: homepage OG is the hero still, photo only", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBe("2026-11-02T17:00:00.000Z");
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

  test("OG source is the homepage hero still, photo only", () => {
    const src = readFileSync(OG_SRC, "utf8");
    const image = src.slice(src.indexOf("export default"));
    expect(src).toContain("HERO_STILL_WIDE");
    expect(image).not.toContain("{PUBLIC_COPY.header.wordmark}");
    expect(image).not.toContain("{PUBLIC_COPY.hero.imageAlt}");
    expect(image).not.toMatch(/>\s*Floor|Buyout\s*\{/);
    expect(HERO_STILL_WIDE.src).toBe("/hero-truck-preview.jpg");
    expect(src).not.toMatch(/wrap[-_][^"'\s]*\.(png|jpe?g|svg|webp)/i);
    expect(src).not.toContain("artwork");
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
    expect(PUBLIC_COPY.header.wordmark).toBe("BrandMyBeast");
    expect(PUBLIC_COPY.hero.imageAlt).toBe(
      "Example wrap on the BrandMyBeast truck. Seats are open for bids.",
    );
    expect(PUBLIC_COPY.hero.imageAlt.toLowerCase()).not.toContain("not sold yet");
    expect(PUBLIC_COPY.hero.imageAlt.toLowerCase()).not.toContain("no wrap yet");
  });

  test("homepage OG image is a 1200x630 png of the still", async ({
    page,
    request,
  }) => {
    const og = await request.get("/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"] ?? "").toMatch(/image\/png/i);
    const body = await og.body();
    expect(body.byteLength).toBeGreaterThan(40_000);
    expect(pngSize(body)).toEqual({ width: 1200, height: 630 });

    await page.goto("/");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /opengraph-image/i,
    );
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      PUBLIC_COPY.hero.ogImageAlt,
    );
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
