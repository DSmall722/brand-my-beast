import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  contrastRatio,
} from "../src/lib/contrast-ratio";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.39 — baked TRACE AID `(1) Hood` ink vs plate meets 4.5:1.
 * No DOM chip — labels live in the JPEG. CLOSE_AT null. No Stripe.
 */

test.describe("slice 16.39: callout contrast on stainless", () => {
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

  test("baked (1) Hood ink vs plate is at least 4.5:1", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/panels/hood");
    await expect(page.getByTestId("truck-seat-label-hood")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "data-seat-label",
      "(1) Hood",
    );
    await page.locator(".truck-view-photo").evaluate((el) => {
      const img = el as HTMLImageElement;
      if (img.complete && img.naturalWidth > 0) return;
      return new Promise<void>((resolve, reject) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => reject(new Error("still failed")), {
          once: true,
        });
      });
    });
    const sample = await page.evaluate(() => {
      const img = document.querySelector(".truck-view-photo");
      if (!(img instanceof HTMLImageElement) || img.naturalWidth === 0) {
        return null;
      }
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      // Hood label is centered on the TRACE AID hood flat (~50%, 31%).
      const cx = Math.round(img.naturalWidth * 0.5);
      const cy = Math.round(img.naturalHeight * 0.31);
      const half = 80;
      let dark: [number, number, number] | null = null;
      let light: [number, number, number] | null = null;
      let darkY = 1;
      let lightY = 0;
      for (let y = cy - half; y <= cy + half; y += 2) {
        for (let x = cx - half; x <= cx + half; x += 2) {
          if (x < 0 || y < 0 || x >= img.naturalWidth || y >= img.naturalHeight) {
            continue;
          }
          const px = ctx.getImageData(x, y, 1, 1).data;
          const r = px[0] ?? 0;
          const g = px[1] ?? 0;
          const b = px[2] ?? 0;
          const ylin =
            0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
          if (ylin < darkY) {
            darkY = ylin;
            dark = [r, g, b];
          }
          if (ylin > lightY) {
            lightY = ylin;
            light = [r, g, b];
          }
        }
      }
      if (!dark || !light) return null;
      return { dark, light };
    });
    expect(sample).not.toBeNull();
    const ratio = contrastRatio(sample!.dark, sample!.light);
    expect(
      ratio,
      `dark ${sample!.dark.join(",")} light ${sample!.light.join(",")} ratio ${ratio.toFixed(2)}`,
    ).toBeGreaterThanOrEqual(4.5);
  });
});
