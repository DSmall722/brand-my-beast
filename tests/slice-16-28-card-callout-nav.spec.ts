import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { panelBoardMarkFor } from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.28 — card #4 keeps the driver-door href and opens the bid desk.
 * Board number 4 still opens /panels/driver-door.
 * Hero has no painted seat numbers. FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

const PANEL_PATH = "/panels/driver-door";

test.describe("slice 16.28: card 4 opens the bid desk; board number 4 opens driver door", () => {
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

  test("card #4 opens the driver-door desk; board number 4 opens the seat", async ({
    page,
  }) => {
    const mark = panelBoardMarkFor("driver-door");
    expect(mark.n).toBe(4);

    await page.goto("/");
    const card = page.getByTestId(`panel-${mark.panelId}`);
    await expect(card).toHaveAttribute("data-panel-n", "4");
    const index = page.getByTestId(`panel-index-${mark.panelId}`);
    await expect(index).toHaveText("4");
    const link = page.getByTestId(`panel-link-${mark.panelId}`);
    await expect(link).toHaveAttribute("href", PANEL_PATH);
    await index.click();
    await expect(page).toHaveURL(/\/$/);
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("data-panel-id", mark.panelId);
    await expect(page.getByTestId("bid-modal-seat-link")).toHaveAttribute(
      "href",
      PANEL_PATH,
    );
    await page.getByTestId("bid-modal-seat-link").click();
    await expect(page).toHaveURL(new RegExp(`${PANEL_PATH}$`));
    await expect(page.locator("h1")).toContainText("Driver Side Doors");

    await page.goto("/");
    await expect(
      page.getByTestId(`view-panel-board-driver-${mark.n}`),
    ).toHaveCount(0);
    const legend = page.getByTestId(`panel-legend-${mark.n}`);
    await expect(legend).toHaveAttribute("href", PANEL_PATH);
    await legend.click();
    await expect(page).toHaveURL(new RegExp(`${PANEL_PATH}$`));
    await expect(page.locator("h1")).toContainText("4");
    await expect(page.locator("h1")).toContainText("Driver Side Doors");
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
