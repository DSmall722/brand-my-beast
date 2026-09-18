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
import { panelSeatH1 } from "../src/lib/panel-board";

/**
 * Slice 12.33 — print stylesheet for `/panels/[id]`.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.33: panel print stylesheet", () => {
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

  test("globals.css ships @media print rules for panel seats", () => {
    const board = readFileSync(
      join(process.cwd(), "src/app/styles/board.css"),
      "utf8",
    );
    expect(board).toContain("Slice 12.33");
    expect(board).toMatch(/@media\s+print/);
    expect(board).toContain(".panel-intent.public-seat");
    expect(board).toContain(".site-header");
    expect(board.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("panel page is marked for print sheet", async ({ page }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toHaveAttribute(
      "data-print-sheet",
      "panels",
    );
    const hood = PANELS.find((row) => row.id === "hood");
    expect(hood).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      panelSeatH1(hood!),
    );
    await expect(page.getByTestId("panel-seat-h1")).toHaveAttribute(
      "data-panel-n",
      "1",
    );
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
