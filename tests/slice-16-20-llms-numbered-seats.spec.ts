import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { buildLlmsTxt } from "../src/lib/llms-txt";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PANEL_BOARD_MARKS, panelLegendLabel } from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.20 — /llms.txt lists floor, buyout, eleven numbered seats,
 * and no close date. FEATURES.md stays off /.
 */

test.describe("slice 16.20: /llms.txt numbered seats", () => {
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

  test("builder lists floor, buyout, 1-11 seats, and no close date", () => {
    const body = buildLlmsTxt();
    expect(body).toContain(
      `Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}.`,
    );
    expect(body).toContain("No close date.");
    expect(body).not.toContain("CLOSE_AT");
    expect(body).not.toContain("null");
    expect(body).toContain("Eleven numbered seats");
    expect(PANEL_BOARD_MARKS).toHaveLength(11);
    for (const mark of PANEL_BOARD_MARKS) {
      expect(body).toContain(panelLegendLabel(mark));
    }
    expect(body).not.toMatch(/\b20\d{2}-\d{2}-\d{2}\b/);
    expect(body).not.toMatch(/October 1/);
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(body).not.toMatch(/@gmail\.com/);
    expect(body.toLowerCase()).not.toMatch(/stripe/);
  });

  test("GET /llms.txt is the same plain text", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"] ?? "").toMatch(/text\/plain/);
    const body = await res.text();
    expect(body).toBe(buildLlmsTxt());
    expect(body).toContain("1 Hood");
    expect(body).toContain("11 Rear bumper");
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
