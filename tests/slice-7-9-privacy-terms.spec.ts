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
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * QA 1047PM — /privacy is a short real policy; /terms is gone.
 * Footer keeps Privacy only. Back to the board is a button.
 */
test.describe("slice 7.9: privacy policy; terms removed", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
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

  test("footer links privacy only; keeps PUBLIC_COPY strings", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("site-footer-line")).toHaveText(
      PUBLIC_COPY.footer.line,
    );
    await expect(page.getByTestId("site-footer-independent")).toHaveCount(0);
    await expect(page.getByTestId("footer-privacy-link")).toHaveAttribute(
      "href",
      "/privacy",
    );
    await expect(page.getByTestId("footer-terms-link")).toHaveCount(0);
  });

  test("privacy page is a short useful policy with a real back button", async ({
    page,
  }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-page")).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toContainText(
      BRAND.email,
    );
    await expect(page.getByTestId("privacy-collect")).toBeVisible();
    await expect(page.getByTestId("privacy-why")).toBeVisible();
    await expect(page.getByTestId("privacy-providers")).toBeVisible();
    await expect(page.getByTestId("privacy-retention")).toBeVisible();
    await expect(page.getByTestId("privacy-access")).toBeVisible();
    await expect(page.getByTestId("privacy-cookies")).toBeVisible();
    await expect(page.getByTestId("legal-back-button")).toHaveText(
      "Back to the board",
    );
    await expect(page.getByTestId("legal-back-button")).toHaveClass(/btn/);
    await expect(page.getByTestId("privacy-independent")).toHaveCount(0);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
    expect(html).not.toContain("independent. not tesla");
  });

  test("terms redirects to privacy", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByTestId("privacy-page")).toBeVisible();
    await expect(page.getByTestId("terms-page")).toHaveCount(0);
  });
});
