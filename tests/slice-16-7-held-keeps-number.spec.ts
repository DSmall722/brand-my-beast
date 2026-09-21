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
 * Slice 16.7 — occupied seats keep the number and add Held.
 * Held keeps the number on the board. Hero is the house-wrap concept.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 16.7: held seats keep the number", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

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

  test("held hood keeps number 1 and Held; photo stays stainless", async ({
    page,
  }) => {
    await signIn(page, "held167@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Held Number Co");
    await page.getByTestId("intent-trade").fill("held vinyl");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await page.goto("/");
    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);

    await page.getByTestId("truck-view-side").click();
    await expect(page.getByTestId("view-panel-board-side-1")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-baked-marks",
      "true",
    );

    await expect(page.getByTestId("truck-img-hero")).toHaveAttribute(
      "src",
      "/hero-truck-preview.jpg",
    );
    await expect(page.getByTestId("truck-img-board-side")).toHaveAttribute(
      "src",
      "/truck-view-side.jpg",
    );
    const photos = page.locator(".hero img, .truck-view-stage img");
    const photoCount = await photos.count();
    expect(photoCount).toBeGreaterThan(0);
    for (let i = 0; i < photoCount; i += 1) {
      const src = await photos.nth(i).getAttribute("src");
      expect(src).toMatch(
        /^\/(hero-truck-preview|truck-view-(side|front|rear))\.jpg$/,
      );
    }
    await expect(
      page.locator(".hero .compositor-etch-mark, .truck-view-stage .compositor-etch-mark"),
    ).toHaveCount(0);

    await expect(page.getByTestId("panel-index-hood")).toHaveText("1");

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
