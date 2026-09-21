import { expect, test, type Page } from "@playwright/test";
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
 * Slice 16.10 — callout hit area ≥44px. Keyboard focus ring visible.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

const HIT_MIN = 44;

async function expectHitAtLeast(
  page: Page,
  testId: string,
): Promise<void> {
  const callout = page.getByTestId(testId);
  await expect(callout).toBeVisible();
  const hit = callout.locator(".truck-seat-hit");
  const box = (await hit.count())
    ? await hit.boundingBox()
    : await callout.locator("polygon").boundingBox();
  if (!box) throw new Error(`${testId} box missing`);
  expect(box.width).toBeGreaterThanOrEqual(HIT_MIN - 0.5);
  expect(box.height).toBeGreaterThanOrEqual(HIT_MIN - 0.5);
}

test.describe("slice 16.10: callout hit area and focus ring", () => {
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

  test("side-view callouts are at least 44px; hero has no overlay", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);

    await page.goto("/panels/hood");
    for (const id of ["hood", "front-fascia", "front-bumper"] as const) {
      await expectHitAtLeast(page, `truck-seat-${id}`);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/panels/hood");
    for (const id of ["hood", "front-fascia", "front-bumper"] as const) {
      await expectHitAtLeast(page, `truck-seat-${id}`);
    }

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
  });

  test("keyboard focus draws a visible signal ring", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/panels/hood");
    const callout = page.getByTestId("truck-seat-front-bumper");
    await expect(callout).toBeVisible();

    const ring = await callout.evaluate((el) => {
      if (!(el instanceof Element) || !("focus" in el)) {
        throw new Error("callout missing");
      }
      const target = el as SVGElement;
      const opts: FocusOptions & { focusVisible?: boolean } = {
        focusVisible: true,
      };
      target.focus(opts);
      const style = getComputedStyle(el);
      return {
        focusVisible: el.matches(":focus-visible"),
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow,
      };
    });

    expect(ring.focusVisible).toBe(true);
    expect(ring.outlineStyle).not.toBe("none");
    expect(ring.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(ring.outlineColor).toBe("rgb(214, 255, 63)");
  });
});
