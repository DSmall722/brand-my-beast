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
  compositeOver,
  contrastRatio,
} from "../src/lib/contrast-ratio";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.39 — number badge vs stainless still meets 4.5:1.
 * CLOSE_AT null. No Stripe.
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

  test("badge 3 against the still is at least 4.5:1", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/panels/hood");
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
    await expect(page.getByTestId("view-panel-board-driver-3")).toBeVisible();
    const sample = await page.evaluate(() => {
      const callout = document.querySelector(
        '[data-testid="view-panel-board-driver-3"]',
      );
      const img = document.querySelector(".truck-view-photo");
      if (!(callout instanceof HTMLElement) || !(img instanceof HTMLImageElement)) {
        return null;
      }
      const paint = document.createElement("canvas");
      paint.width = 1;
      paint.height = 1;
      const paintCtx = paint.getContext("2d");
      if (!paintCtx) return null;
      paintCtx.fillStyle = getComputedStyle(callout).backgroundColor;
      paintCtx.fillRect(0, 0, 1, 1);
      const badgePx = paintCtx.getImageData(0, 0, 1, 1).data;

      const ir = img.getBoundingClientRect();
      const cr = callout.getBoundingClientRect();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx || ir.width === 0) return null;
      ctx.drawImage(img, 0, 0);
      const sx = Math.min(
        img.naturalWidth - 1,
        Math.max(
          0,
          Math.round(((cr.right + 36 - ir.left) / ir.width) * img.naturalWidth),
        ),
      );
      const sy = Math.min(
        img.naturalHeight - 1,
        Math.max(
          0,
          Math.round(
            ((cr.top + cr.height / 2 - ir.top) / ir.height) * img.naturalHeight,
          ),
        ),
      );
      const steelPx = ctx.getImageData(sx, sy, 1, 1).data;
      return {
        badge: [badgePx[0], badgePx[1], badgePx[2], badgePx[3] / 255] as [
          number,
          number,
          number,
          number,
        ],
        steel: [steelPx[0], steelPx[1], steelPx[2]] as [number, number, number],
      };
    });
    expect(sample).not.toBeNull();
    const plate = compositeOver(sample!.badge, sample!.steel);
    const ratio = contrastRatio(plate, sample!.steel);
    expect(
      ratio,
      `badge ${sample!.badge.join(",")} steel ${sample!.steel.join(",")} plate ${plate.join(",")} ratio ${ratio.toFixed(2)}`,
    ).toBeGreaterThanOrEqual(4.5);
  });
});
