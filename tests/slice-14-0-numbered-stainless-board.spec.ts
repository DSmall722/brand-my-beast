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
import {
  PANEL_BOARD_MARKS,
  panelBoardIsComplete,
  panelBoardMarksForView,
} from "../src/lib/panel-board";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 14.0 — numbered stainless board on hero + truck views.
 * Playwright 390px: ≥6 numbers visible. PUBLIC_COPY H1 + Notify me.
 * No lease. No personal handle. CLOSE_AT null. No Stripe.
 */
test.describe("slice 14.0: numbered stainless board", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
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

  test("board marks match PANELS 1–11", () => {
    expect(panelBoardIsComplete()).toBe(true);
    expect(PANEL_BOARD_MARKS).toHaveLength(11);
    expect(PANEL_BOARD_MARKS[0]?.panelId).toBe("hood");
    expect(PANEL_BOARD_MARKS[0]?.n).toBe(1);
    expect(PANEL_BOARD_MARKS[10]?.panelId).toBe("rear-bumper");
    expect(PANEL_BOARD_MARKS[10]?.n).toBe(11);
    for (let i = 0; i < PANELS.length; i += 1) {
      expect(PANEL_BOARD_MARKS[i]?.panelId).toBe(PANELS[i]!.id);
      expect(PANEL_BOARD_MARKS[i]?.name).toBe(PANELS[i]!.name);
      expect(PANEL_BOARD_MARKS[i]?.n).toBe(i + 1);
    }
    expect(panelBoardMarksForView("driver").length).toBeGreaterThanOrEqual(6);
    expect(panelBoardMarksForView("passenger").length).toBeGreaterThanOrEqual(3);
    expect(panelBoardMarksForView("front").length).toBeGreaterThanOrEqual(3);
    expect(panelBoardMarksForView("rear").length).toBe(2);
  });

  test("390px homepage shows ≥6 numbered callouts, H1, Notify me", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );

    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);
    await expect(page.getByTestId("truck-img-hero")).toHaveAttribute(
      "src",
      "/hero-truck-preview.jpg",
    );

    for (let n = 1; n <= 11; n += 1) {
      const legend = page.getByTestId(`panel-legend-${n}`);
      await expect(legend).toHaveAttribute(
        "href",
        `/panels/${PANEL_BOARD_MARKS[n - 1]!.panelId}`,
      );
    }

    const viewport = page.viewportSize();
    if (!viewport) throw new Error("viewport missing");
    let visibleCount = 0;
    for (let n = 1; n <= 11; n += 1) {
      const box = await page.getByTestId(`panel-legend-${n}`).boundingBox();
      if (!box) continue;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      if (cx >= 0 && cx <= viewport.width && cy >= 0 && cy <= viewport.height) {
        visibleCount += 1;
      }
    }
    expect(visibleCount).toBeGreaterThanOrEqual(6);

    await expect(page.getByTestId("truck-view-stage").locator("img")).toHaveAttribute(
      "src",
      "/truck-view-driver.jpg",
    );
    await expect(page.getByTestId("view-panel-board-driver")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-baked-marks",
      "true",
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
    expect(html).not.toContain("teslacyberbeast");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("CLOSE_AT");
  });
});
