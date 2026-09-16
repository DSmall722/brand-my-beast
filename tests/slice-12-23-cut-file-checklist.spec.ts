import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  SHOP_CUT_FILE_CHECKLIST,
  assertShopCutFileChecklistDoesNotSetCloseAt,
} from "../src/lib/shop-cut-file-checklist";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 12.23 — shop cut-file checklist as a form on /partner/shop.
 * Not a card. Not on `/`. CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.23: shop cut-file checklist form", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
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

  test("checklist ids cover vector, no-raster, panel-label, approval, etch-gate", () => {
    const ids = SHOP_CUT_FILE_CHECKLIST.map((item) => item.id);
    expect(ids).toEqual([
      "vector",
      "no-raster",
      "panel-label",
      "approval-before-cut",
      "etch-gate",
    ]);
    expect(assertShopCutFileChecklistDoesNotSetCloseAt(ids)).toBe(true);
    expect(CLOSE_AT).toBeNull();
    const etch = SHOP_CUT_FILE_CHECKLIST.find((item) => item.id === "etch-gate");
    expect(etch?.label).toContain("$120,000");
  });

  test("homepage does not render the cut-file checklist card or form", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("shop-cut-file-checklist")).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toContain("shop-cut-file-checklist");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("partner shop shows a form checklist, not a card", async ({ page }) => {
    await signIn(page, "shop@example.com");
    await page.goto("/partner/shop");
    await expect(page.getByTestId("partner-shop")).toBeVisible();

    const form = page.getByTestId("shop-cut-file-checklist");
    await expect(form).toBeVisible();
    await expect(form).toHaveJSProperty("tagName", "FORM");
    await expect(form).toHaveAttribute("data-auction-clock", "unset");
    const className = (await form.getAttribute("class")) ?? "";
    expect(className.toLowerCase()).not.toContain("card");

    await expect(page.getByTestId("shop-cut-file-fence")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("shop-cut-file-fence")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("shop-cut-file-fence")).toContainText(
      "Auction clock stays unset",
    );
    await expect(page.getByTestId("shop-cut-file-fence")).toContainText(
      "No card capture",
    );
    await expect(page.getByTestId("shop-cut-file-fence")).not.toContainText(
      "Stripe",
    );

    for (const item of SHOP_CUT_FILE_CHECKLIST) {
      const box = page.getByTestId(`shop-cut-check-${item.id}`);
      await expect(box).toBeVisible();
      await box.check();
      await expect(box).toBeChecked();
    }

    await expect(form).toHaveAttribute("data-auction-clock", "unset");
    expect(CLOSE_AT).toBeNull();

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html.toLowerCase()).not.toContain("gmail.com");
    expect(html).not.toContain("CLOSE_AT");
  });
});
