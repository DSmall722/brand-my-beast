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
import { hotspotPanelIds, hotspotsForView, TRUCK_VIEWS } from "../src/lib/truck-views";

/**
 * Slice 10.1 — hero / hotspot links go to `/panels/[id]`, not only `#panels`.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 10.1: hero and hotspot links open seats", () => {
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

  test("hotspot map covers real panel ids", () => {
    const ids = new Set(PANELS.map((p) => p.id));
    expect(hotspotPanelIds().length).toBeGreaterThan(5);
    for (const view of TRUCK_VIEWS) {
      for (const spot of hotspotsForView(view.id)) {
        expect(ids.has(spot.panelId)).toBe(true);
      }
    }
  });

  test("homepage hero and hotspots open /panels/[id]", async ({ page }) => {
    await page.goto("/");
    const hero = page.getByTestId("hero-truck-preview");
    await expect(hero).toHaveAttribute("href", "/panels/hood");
    await expect(page.getByTestId("hero-secondary-cta")).toHaveAttribute(
      "href",
      "/panels/hood",
    );
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "href",
      "/panels/hood",
    );

    await page.getByTestId("hero-truck-preview").click();
    await expect(page).toHaveURL(/\/panels\/hood$/);
    await expect(page.getByTestId("intent-signin-needed")).toBeVisible();

    await page.goto("/");
    await page.getByTestId("truck-seat-hood").click();
    await expect(page).toHaveURL(/\/panels\/hood$/);

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
