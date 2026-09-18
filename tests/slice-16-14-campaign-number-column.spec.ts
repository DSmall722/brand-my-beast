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
 * Slice 16.14 — CAMPAIGN.md inventory table includes the number column.
 * Opening dollars match PANELS. Floor and buyout unchanged.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

const CAMPAIGN = join(process.cwd(), "CAMPAIGN.md");

const BUYOUT_LINES = [
  "$99,990",
  "$1,995",
  "$10,000",
  "$4,960",
] as const;

test.describe("slice 16.14: CAMPAIGN inventory number column", () => {
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

  test("inventory n column matches PANELS; budget dollars stay", () => {
    const campaign = readFileSync(CAMPAIGN, "utf8");
    expect(campaign).toContain("## Inventory");
    expect(campaign).toContain("| n | Panel | Opening |");
    expect(campaign).toContain("$58,000");
    expect(campaign).toContain("$120,000");
    expect(campaign).toMatch(/## Money \(locked 2026-09-13\)/);
    for (const line of BUYOUT_LINES) {
      expect(campaign).toContain(line);
    }
    expect(campaign.toLowerCase()).not.toContain("gmail.com");

    expect(PANELS).toHaveLength(12);
    for (const panel of PANELS) {
      const mark = panelBoardMarkFor(panel.id);
      expect(campaign).toContain(
        `| ${mark.n} | ${panel.name} | ${formatUsd(panel.openingUsd)} |`,
      );
    }
    expect(campaign).toContain("| 1 | Hood | $2,500 |");
    expect(campaign).toContain("| 12 | Rear fascia | $500 |");
  });
});
