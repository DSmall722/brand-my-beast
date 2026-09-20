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
import { panelFaceCropsAreDistinct } from "../src/lib/panel-board";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 17.10 — homepage .panel-face is not an empty black rectangle.
 * Reuses the hero still. No invented wrap. CLOSE_AT null. No Stripe.
 */

test.describe("slice 17.10: panel faces use the stainless still", () => {
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("face crops are unique per panel", () => {
    expect(panelFaceCropsAreDistinct()).toBe(true);
  });

  test("panel-face rule cites the shared still, not a black well", () => {
    const css = readFileSync(
      join(process.cwd(), "src/app/styles/board.css"),
      "utf8",
    );
    const block = css.split(".panel-face {")[1]?.split("}")[0] ?? "";
    expect(block).toContain('url("/hero-truck-preview.jpg")');
    expect(block).not.toContain("var(--steel-950)");
  });

  test("homepage panel faces render distinct crops", async ({ page }) => {
    await page.goto("/");
    const face = page.getByTestId("panel-face-hood");
    await expect(face).toBeVisible();
    const bg = await face.evaluate(
      (el) => getComputedStyle(el).backgroundImage,
    );
    expect(bg).toContain("truck-view-front.jpg");
    const positions = new Set<string>();
    const stills = new Set<string>();
    for (const id of [
      "hood",
      "front-fascia",
      "driver-door",
      "passenger-door",
      "driver-bed",
      "passenger-bed",
      "driver-rear-quarter",
      "passenger-rear-quarter",
      "tailgate",
      "tonneau",
      "roof",
      "rear-fascia",
    ]) {
      const card = page.getByTestId(`panel-face-${id}`);
      const pos = await card.getAttribute("data-face-pos");
      const still = await card.getAttribute("data-face-still");
      expect(pos).toBeTruthy();
      expect(still).toBeTruthy();
      positions.add(`${still}:${pos}`);
      stills.add(still ?? "");
    }
    expect(positions.size).toBe(12);
    expect(stills.size).toBeGreaterThan(1);
    const box = await face.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(40);
    expect(box?.height ?? 0).toBeGreaterThan(20);
    const html = await page.content();
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
