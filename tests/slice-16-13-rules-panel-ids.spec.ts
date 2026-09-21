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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { panelBoardMarkFor } from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.13 — RULES.md lists 1–11 next to panel ids.
 * Opening dollars unchanged. CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

const RULES = join(process.cwd(), "RULES.md");

test.describe("slice 16.13: RULES.md 1–11 next to panel ids", () => {
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

  test("inventory rows put n beside the panel id and keep openings", () => {
    const rules = readFileSync(RULES, "utf8");
    expect(rules).toContain("Board order is 1–11 next to each panel id");
    expect(rules).toContain("$58,000");
    expect(rules).toContain("$120,000");
    expect(rules).toContain("The floor is not the sum of openings");
    expect(rules.toLowerCase()).not.toMatch(/\blease\b/);
    expect(rules).not.toMatch(/@gmail\.com/i);

    expect(PANELS).toHaveLength(11);
    for (const panel of PANELS) {
      const mark = panelBoardMarkFor(panel.id);
      expect(rules).toContain(
        `| ${mark.n} | \`${panel.id}\` | ${panel.name} | ${formatUsd(panel.openingUsd)} |`,
      );
    }
    expect(rules).toContain("| 1 | `hood` |");
    expect(rules).toContain("| 11 | `rear-bumper` |");
  });
});
