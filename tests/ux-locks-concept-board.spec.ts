import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Dennard UX locks on the homepage board + hero.
 * CLOSE_AT null. No Stripe. No lease.
 */

test.describe("UX locks: concept lead, baked board, etch, CTA, wrap blend", () => {
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

  test("homepage lead, board, badge, and See the panels", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.locator(".hero-lead")).toHaveText("Concept preview");
    await expect(page.locator(".hero-lead")).not.toContainText("Twelve companies");
    await expect(page.getByTestId("hero-truck-preview")).toHaveAttribute(
      "href",
      "/panels/hood",
    );
    await expect(page.getByTestId("hero-secondary-cta")).toHaveAttribute(
      "href",
      "#panels",
    );

    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-baked-marks",
      "true",
    );
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-polygons",
      "outline",
    );
    await expect(page.getByTestId("view-panel-board-driver")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-svg")).toHaveCount(1);
    await expect(page.getByTestId("truck-seat-hood")).toBeVisible();
    await expect(page.getByTestId("truck-img-board-driver")).toBeVisible();
    await page.getByTestId("truck-view-passenger").click();
    await expect(page.getByTestId("truck-img-board-passenger")).toBeVisible();
    await page.getByTestId("truck-view-front").click();
    await expect(page.getByTestId("truck-img-board-front")).toBeVisible();
    await page.getByTestId("truck-view-rear").click();
    await expect(page.getByTestId("truck-img-board-rear")).toBeVisible();

    await expect(page.getByTestId("panel-grid").locator("article")).toHaveCount(
      11,
    );
    const etchable = PANELS.find((panel) => isEtchable(panel));
    expect(etchable).toBeTruthy();
    await expect(page.getByTestId(`etch-lock-${etchable!.id}`)).toHaveText(
      "Immortal Etch locked until $120k",
    );

    await page.getByTestId("hero-secondary-cta").click();
    await expect(page).toHaveURL(/#panels$/);
    await expect(page.locator("#panels")).toBeVisible();
    await expect(page).not.toHaveURL(/\/panels\/hood/);

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
