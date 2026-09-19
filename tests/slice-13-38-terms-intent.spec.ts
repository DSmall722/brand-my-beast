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
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 13.38 — Terms stub adds “Intent is not a charge.”
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

test.describe("slice 13.38: terms stub intent is not a charge", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("unit: PUBLIC_COPY locks intent-is-not-a-charge line", () => {
    expect(PUBLIC_COPY.footer.intentNotACharge).toBe(
      "Intent is not a charge.",
    );
  });

  test("terms page shows Intent is not a charge", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByTestId("terms-page")).toBeVisible();
    await expect(page.getByTestId("terms-intent-not-charge")).toHaveText(
      "Intent is not a charge.",
    );
    await expect(page.getByTestId("terms-intent")).toContainText(
      "Intent is not a charge.",
    );
    await expect(page.getByTestId("terms-floor")).toContainText("$58,000");
    await expect(page.getByTestId("terms-clock")).toHaveText(
      "When seats open. There is no date on this page yet.",
    );
    await expect(page.getByTestId("terms-contact")).toContainText(BRAND.email);

    const html = await page.content();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toMatch(/stripe/);
  });
});
