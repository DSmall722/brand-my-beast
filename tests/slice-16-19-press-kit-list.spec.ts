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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import { PANEL_BOARD_MARKS } from "../src/lib/panel-board";

/**
 * Slice 16.19 — press-kit fact sheet includes the 1–11 board list.
 * Money unchanged. FEATURES.md stays off /.
 */

const FACT = join(process.cwd(), "press-kit/FACT-SHEET.md");

test.describe("slice 16.19: press-kit fact sheet lists 1-11", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("fact sheet board order is the 1-11 panel list", () => {
    const text = readFileSync(FACT, "utf8");
    expect(text).toContain("## Board order");
    expect(PANEL_BOARD_MARKS).toHaveLength(11);
    for (const mark of PANEL_BOARD_MARKS) {
      expect(text).toContain(`${mark.n}. ${mark.name}`);
    }
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text.toLowerCase()).not.toMatch(/wrap-as-delivered/);
    expect(text.toLowerCase()).not.toMatch(/\blease\b/);
    expect(text).not.toMatch(/@gmail\.com/);
    expect(text).not.toMatch(/close date is|closes on|October 1/i);
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("## Board order");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
