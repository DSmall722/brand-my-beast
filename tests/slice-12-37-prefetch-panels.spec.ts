import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 12.37 — prefetch `/panels/*` from homepage cards.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.37: prefetch panels from homepage cards", () => {
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

  test("HomePanelsSection Link cards set prefetch={true}", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/home/HomePanelsSection.tsx"),
      "utf8",
    );
    expect(src).toContain("prefetch={true}");
    expect(src).toContain("data-prefetch-panel={panel.id}");
    expect(src).toContain("`/panels/${panel.id}`");
  });

  test("homepage panel cards link to every /panels/[id]", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    for (const panel of PANELS) {
      const link = page.getByTestId(`panel-link-${panel.id}`);
      await expect(link).toHaveAttribute("href", `/panels/${panel.id}`);
      await expect(link).toHaveAttribute("data-prefetch-panel", panel.id);
    }
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
