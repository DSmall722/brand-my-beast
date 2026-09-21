import { expect, test } from "@playwright/test";
import { BRAND, CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { buildLlmsTxt } from "../src/lib/llms-txt";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PANEL_BOARD_MARKS, panelLegendLabel } from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 18.5 — /llms.txt drops the CLOSE_AT is null line.
 * Keep floor, buyout, no close date, and the 1–11 list.
 */

test.describe("slice 18.5: llms.txt drops CLOSE_AT", () => {
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("body keeps money and the numbered list without CLOSE_AT", async ({
    request,
  }) => {
    const res = await request.get("/llms.txt");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toBe(buildLlmsTxt());
    expect(body).toContain("Floor $58,000. Buyout $120,000.");
    expect(body).toContain("No close date.");
    expect(body).not.toContain("CLOSE_AT");
    expect(body).not.toContain("null");
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(PANEL_BOARD_MARKS).toHaveLength(11);
    for (const mark of PANEL_BOARD_MARKS) {
      expect(body).toContain(panelLegendLabel(mark));
    }
  });
});
