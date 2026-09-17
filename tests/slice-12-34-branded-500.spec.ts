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
 * Slice 12.34 — error boundary + branded 500 that is not a panel.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.34: branded error boundary", () => {
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

  test("error.tsx is a client boundary with branded not-a-panel copy", () => {
    const src = readFileSync(join(process.cwd(), "src/app/error.tsx"), "utf8");
    expect(src).toMatch(/["']use client["']/);
    expect(src).toContain("data-testid=\"error-page\"");
    expect(src).toContain("This is not a panel.");
    expect(src).toContain("retry");
    expect(src).toContain("BRAND.name");
    expect(src).toContain("SiteChromeFooter");
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
    expect(src).not.toMatch(/@gmail\.com/);

    const footer = readFileSync(
      join(process.cwd(), "src/components/SiteChromeFooter.tsx"),
      "utf8",
    );
    expect(footer).toContain("PUBLIC_COPY.footer.line");
    expect(footer).toContain("PUBLIC_COPY.footer.independent");
  });

  test("homepage still healthy with error boundary present", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("error-page")).toHaveCount(0);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
