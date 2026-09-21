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
 * Slice 10.1 — hero photo opens Hood; “See the eleven panels” lands on `#panels`.
 * Homepage board stills are static. Cards / legend open seats. CLOSE_AT null. No Stripe.
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

  test("See the panels lands on the eleven cards, not Hood", async ({
    page,
  }) => {
    await page.goto("/");
    const hero = page.getByTestId("hero-truck-preview");
    await expect(hero).toHaveAttribute("href", "/panels/hood");
    await expect(page.getByTestId("hero-secondary-cta")).toHaveAttribute(
      "href",
      "#panels",
    );
    await expect(page.getByTestId("truck-seat-driver-door")).toHaveAttribute(
      "href",
      "/panels/driver-door",
    );
    await page.getByTestId("truck-view-front").click();
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "href",
      "/panels/hood",
    );
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-baked-marks",
      "true",
    );

    await page.getByTestId("hero-secondary-cta").click();
    await expect(page).toHaveURL(/#panels$/);
    await expect(page.locator("#panels")).toBeVisible();
    await expect(page.getByTestId("panel-grid").locator("article")).toHaveCount(
      11,
    );
    await expect(page).not.toHaveURL(/\/panels\/hood/);

    await page.goto("/");
    await page.getByTestId("hero-truck-preview").click();
    await expect(page).toHaveURL(/\/panels\/hood$/);
    await expect(page.getByTestId("intent-signin-needed")).toBeVisible();

    await page.goto("/");
    await page.getByTestId("panel-link-hood").click();
    await expect(page).toHaveURL(/\/panels\/hood$/);

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
