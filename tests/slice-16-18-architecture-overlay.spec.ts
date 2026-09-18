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
import { PANEL_BOARD_MARKS, panelLegendLabel } from "../src/lib/panel-board";

/**
 * Slice 16.18 — ARCHITECTURE.md board diagram names the numbered overlay,
 * not only the schematic SVG. FEATURES.md stays off /.
 */

const ARCH = join(process.cwd(), "ARCHITECTURE.md");

function boardDiagram(text: string): string {
  const start = text.indexOf("## Board diagram");
  expect(start, "Board diagram heading").toBeGreaterThan(-1);
  const rest = text.slice(start + "## Board diagram".length);
  const next = rest.search(/\n## /);
  return next === -1 ? rest : rest.slice(0, next);
}

test.describe("slice 16.18: ARCHITECTURE diagram includes numbered overlay", () => {
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

  test("board diagram names schematic SVG and the 1-12 overlay", () => {
    const text = readFileSync(ARCH, "utf8");
    const diagram = boardDiagram(text);
    expect(diagram).toMatch(/schematic SVG/);
    expect(diagram).toMatch(/numbered overlay/);
    expect(diagram).toMatch(/not only the schematic SVG/);
    expect(PANEL_BOARD_MARKS).toHaveLength(12);
    for (const mark of PANEL_BOARD_MARKS) {
      expect(diagram).toContain(panelLegendLabel(mark));
    }
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text).toMatch(/not wired/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
