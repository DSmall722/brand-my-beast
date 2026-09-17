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
 * Slice 13.39 — Privacy stub waitlist retention:
 * until seats open or user deletes.
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

  test("privacy page shows waitlist retention copy", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-page")).toBeVisible();
    await expect(page.getByTestId("privacy-waitlist-retention")).toHaveText(
      "Waitlist retention: until seats open or user deletes.",
    );
    await expect(page.getByTestId("privacy-waitlist-retention")).toContainText(
      "until seats open or user deletes",
    );
    await expect(page.getByTestId("privacy-contact")).toContainText(BRAND.email);
    await expect(page.getByTestId("privacy-waitlist")).toContainText(
      PUBLIC_COPY.waitlist.idleNote,
    );

    const html = await page.content();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toMatch(/stripe/);
  });
});
