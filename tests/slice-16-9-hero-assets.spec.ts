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
  HERO_STILL_NARROW,
  HERO_STILL_SIZES,
  HERO_STILL_SRCSET,
  HERO_STILL_WIDE,
  isLocalHeroStillPath,
} from "../src/lib/hero-still";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.9 — hero still ships a 1280-wide and a 640-wide local asset.
 * No Tesla CDN. CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

function jpegSize(buf: Buffer): { width: number; height: number } {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error("not a jpeg");
  }
  let i = 2;
  while (i + 8 < buf.length) {
    if (buf[i] !== 0xff) throw new Error("jpeg marker missing");
    const marker = buf[i + 1] ?? 0;
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return {
        height: buf.readUInt16BE(i + 5),
        width: buf.readUInt16BE(i + 7),
      };
    }
    i += 2 + len;
  }
  throw new Error("jpeg size missing");
}

test.describe("slice 16.9: hero 1280 and 640 stills, no Tesla CDN", () => {
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

  test("public files are 1280-wide and 640-wide local jpegs", () => {
    for (const still of [HERO_STILL_WIDE, HERO_STILL_NARROW]) {
      expect(isLocalHeroStillPath(still.src)).toBe(true);
      expect(still.src).not.toMatch(/https?:/i);
      expect(still.src.toLowerCase()).not.toContain("tesla");
      const buf = readFileSync(join(process.cwd(), "public", still.src));
      expect(jpegSize(buf)).toEqual({
        width: still.width,
        height: still.height,
      });
    }
    expect(HERO_STILL_WIDE.width).toBe(1280);
    expect(HERO_STILL_NARROW.width).toBe(640);
    expect(HERO_STILL_SRCSET).toContain(HERO_STILL_WIDE.src);
    expect(HERO_STILL_SRCSET).toContain(HERO_STILL_NARROW.src);
    expect(HERO_STILL_SRCSET).not.toMatch(/https?:/i);
  });

  test("hero img ships both widths and never a Tesla CDN", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const img = page.getByTestId("truck-img-hero");
    await expect(img).toHaveAttribute("src", HERO_STILL_WIDE.src);
    await expect(img).toHaveAttribute("srcset", HERO_STILL_SRCSET);
    await expect(img).toHaveAttribute("sizes", HERO_STILL_SIZES);

    const heroHtml = await page.locator("section.hero").innerHTML();
    expect(heroHtml.toLowerCase()).not.toContain("tesla.com");
    expect(heroHtml.toLowerCase()).not.toContain("digitalassets");
    expect(heroHtml).not.toMatch(/\blease\b/i);
    expect(heroHtml).not.toMatch(/@gmail\.com/i);

    for (const still of [HERO_STILL_WIDE, HERO_STILL_NARROW]) {
      const response = await page.request.get(still.src);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"] ?? "").toContain("image/jpeg");
      expect(jpegSize(Buffer.from(await response.body()))).toEqual({
        width: still.width,
        height: still.height,
      });
    }

    await img.evaluate((el: HTMLImageElement) =>
      el.decode().catch(() => undefined),
    );
    const desktopSrc = await img.evaluate((el: HTMLImageElement) => el.currentSrc);
    expect(desktopSrc.endsWith(HERO_STILL_WIDE.src)).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const phoneImg = page.getByTestId("truck-img-hero");
    await phoneImg.evaluate((el: HTMLImageElement) =>
      el.decode().catch(() => undefined),
    );
    const phoneSrc = await phoneImg.evaluate(
      (el: HTMLImageElement) => el.currentSrc,
    );
    expect(phoneSrc.endsWith(HERO_STILL_NARROW.src)).toBe(true);
  });
});
