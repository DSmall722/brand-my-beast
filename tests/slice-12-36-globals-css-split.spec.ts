import { existsSync, readFileSync } from "node:fs";
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
 * Slice 12.36 — globals.css split: tokens / hero / board. No copy change.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.36: globals.css split tokens/hero/board", () => {
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

  test("globals.css imports tokens, hero, and board sheets", () => {
    const root = join(process.cwd(), "src/app");
    const globals = readFileSync(join(root, "globals.css"), "utf8");
    expect(globals).toContain('@import "./styles/tokens.css"');
    expect(globals).toContain('@import "./styles/hero.css"');
    expect(globals).toContain('@import "./styles/board.css"');
    expect(existsSync(join(root, "styles/tokens.css"))).toBe(true);
    expect(existsSync(join(root, "styles/hero.css"))).toBe(true);
    expect(existsSync(join(root, "styles/board.css"))).toBe(true);

    const tokens = readFileSync(join(root, "styles/tokens.css"), "utf8");
    const hero = readFileSync(join(root, "styles/hero.css"), "utf8");
    const board = readFileSync(join(root, "styles/board.css"), "utf8");
    expect(tokens).toContain(":root");
    expect(tokens).toContain("--signal");
    expect(hero).toContain(".hero {");
    expect(hero).toContain(".hero-overlay");
    expect(board).toContain(".btn {");
    expect(board).toContain(".truck-view-seats");
    expect(tokens.toLowerCase()).not.toMatch(/\blease\b/);
    expect(hero.toLowerCase()).not.toMatch(/\blease\b/);
    expect(board.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage copy unchanged after CSS split", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );
    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);
    await expect(page.getByTestId("view-panel-board-side")).toBeVisible();
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
