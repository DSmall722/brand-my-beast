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
 * QA 1047PM — privacy retention lives in the short policy body.
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

test.describe("slice 13.39: privacy waitlist retention", () => {
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

  test("unit: PUBLIC_COPY locks waitlist retention line", () => {
    expect(PUBLIC_COPY.waitlist.retention).toBe(
      "Waitlist retention: until seats open or user deletes.",
    );
  });

  test("privacy page covers retention without auction process notes", async ({
    page,
  }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-page")).toBeVisible();
    await expect(page.getByTestId("privacy-retention")).toContainText(
      "until seats open",
    );
    await expect(page.getByTestId("privacy-contact")).toContainText(BRAND.email);
    await expect(page.getByTestId("privacy-waitlist")).toHaveCount(0);
    await expect(page.getByTestId("privacy-waitlist-retention")).toHaveCount(0);

    const html = await page.content();
    expect(html).toContain("BrandMyBeast");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toMatch(/stripe/);
  });
});
