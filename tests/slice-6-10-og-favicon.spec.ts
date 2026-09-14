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
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 6.10 — OG image + favicon, public brand only.
 * Does not rewrite PUBLIC_COPY. Does not steal 6.11 homepage copy checks.
 */
test.describe("slice 6.10: OG image and favicon, public brand only", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
    expect(BRAND.domain).toBe("brandmybeast.com");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
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

  test("serves branded favicon and app icon", async ({ request }) => {
    const favicon = await request.get("/favicon.ico");
    expect(favicon.status()).toBe(200);
    const faviconType = favicon.headers()["content-type"] ?? "";
    expect(faviconType).toMatch(/image|icon|octet-stream/i);
    expect((await favicon.body()).byteLength).toBeGreaterThan(0);

    const icon = await request.get("/icon.svg");
    expect(icon.status()).toBe(200);
    const iconBody = await icon.text();
    expect(iconBody).toContain("BrandMyBeast");
    expect(iconBody.toLowerCase()).not.toMatch(/\blease\b/);
    expect(iconBody.toLowerCase()).not.toContain("gmail.com");

    const apple = await request.get("/apple-icon");
    expect(apple.status()).toBe(200);
    expect(apple.headers()["content-type"] ?? "").toMatch(/image\/png/i);
    expect((await apple.body()).byteLength).toBeGreaterThan(800);
  });

  test("serves opengraph and twitter images with public brand metadata", async ({
    page,
    request,
  }) => {
    const og = await request.get("/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"] ?? "").toMatch(/image\/png/i);
    expect((await og.body()).byteLength).toBeGreaterThan(8_000);

    const twitter = await request.get("/twitter-image");
    expect(twitter.status()).toBe(200);
    expect(twitter.headers()["content-type"] ?? "").toMatch(/image\/png/i);
    expect((await twitter.body()).byteLength).toBeGreaterThan(8_000);

    await page.goto("/");
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /opengraph-image/i);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      BRAND.name,
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      PUBLIC_COPY.meta.description,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      /twitter-image/i,
    );

    const html = (await page.content()).toLowerCase();
    expect(html).toContain(BRAND.name.toLowerCase());
    expect(html).toContain(formatUsd(FLOOR_USD).toLowerCase());
    expect(html).toContain(formatUsd(GOAL_USD).toLowerCase());
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("close_at");
  });
});
