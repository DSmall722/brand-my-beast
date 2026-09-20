import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

const LOCKED_H1 = "Put your brand on the truck people already photograph.";

test.describe("Syne lockup, board marks, seat lead", () => {
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

  test("How it works puts only Immortal Etch in Syne", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const lockups = page.locator("#story .immortal-etch");
    await expect(lockups).toHaveCount(2);
    for (const lockup of await lockups.all()) {
      await expect(lockup).toHaveText("Immortal Etch");
    }
    const forever = page.locator("#story .story-step-copy").nth(2);
    await expect(forever).toContainText(PUBLIC_COPY.etch.forever);
    const fonts = await page.evaluate(() => {
      const lockup = document.querySelector("#story .immortal-etch");
      const title = document.querySelector("#story .story-step-title");
      const num = document.querySelector("#story .story-num");
      const copy = document.querySelector("#story .story-step-copy");
      if (!lockup || !title || !num || !copy) return null;
      return {
        lockup: getComputedStyle(lockup).fontFamily,
        title: getComputedStyle(title).fontFamily,
        num: getComputedStyle(num).fontFamily,
        copy: getComputedStyle(copy).fontFamily,
      };
    });
    expect(fonts).not.toBeNull();
    expect(fonts!.lockup.toLowerCase()).toMatch(/syne/);
    expect(fonts!.title.toLowerCase()).not.toMatch(/syne/);
    expect(fonts!.num.toLowerCase()).not.toMatch(/syne/);
    expect(fonts!.copy.toLowerCase()).not.toMatch(/syne/);
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
  });

  test("desktop hero marks sit on steel, not the void", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("truck-img-hero")).toBeVisible();
    const samples = await page.evaluate(async () => {
      const img = document.querySelector(".hero-truck-image");
      if (!(img instanceof HTMLImageElement) || img.naturalWidth === 0) {
        return null;
      }
      if (!img.complete) {
        await new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
        });
      }
      const ir = img.getBoundingClientRect();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx || ir.width === 0) return null;
      ctx.drawImage(img, 0, 0);
      const out: { n: number; lum: number }[] = [];
      for (let n = 1; n <= 12; n += 1) {
        const el = document.querySelector(`[data-testid="hero-panel-board-${n}"]`);
        if (!(el instanceof HTMLElement)) return null;
        const cr = el.getBoundingClientRect();
        const sx = Math.min(
          img.naturalWidth - 1,
          Math.max(
            0,
            Math.round(((cr.left + cr.width / 2 - ir.left) / ir.width) * img.naturalWidth),
          ),
        );
        const sy = Math.min(
          img.naturalHeight - 1,
          Math.max(
            0,
            Math.round(((cr.top + cr.height / 2 - ir.top) / ir.height) * img.naturalHeight),
          ),
        );
        const px = ctx.getImageData(sx, sy, 1, 1).data;
        out.push({ n, lum: (px[0] + px[1] + px[2]) / 3 });
      }
      return out;
    });
    expect(samples).not.toBeNull();
    for (const sample of samples!) {
      expect(sample.lum, `mark ${sample.n} on void`).toBeGreaterThan(28);
    }
  });

  test("hood seat lead uses Immortal Etch, fascia uses Wrap only", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    const hood = page.getByTestId("seat-lead");
    await expect(hood).toContainText("Opens at $2,500");
    await expect(hood).toContainText("Immortal Etch");
    await expect(hood).not.toContainText("Etchable only");
    await expect(page.getByTestId("seat-finish")).toHaveAttribute(
      "data-etchable",
      "true",
    );
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("FEATURES.md");

    await page.goto("/panels/front-fascia");
    const fascia = page.getByTestId("seat-lead");
    await expect(fascia).toContainText("Opens at $1,200");
    await expect(fascia).toContainText("Wrap only");
    await expect(fascia).not.toContainText("forever");
    await expect(page.getByTestId("seat-finish")).toHaveAttribute(
      "data-etchable",
      "false",
    );
  });
});
