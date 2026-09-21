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
import { PANEL_BOARD_MARKS, panelLegendLabel } from "../src/lib/panel-board";
import { PUBLIC_COPY, wholeTruckPackageCopy } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.25 — whole-truck intent copy lists 1–11 as the package.
 * FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

test.describe("slice 16.25: whole-truck package is seats 1-11", () => {
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

  test("package copy lists every board mark in order", () => {
    const labels = PANEL_BOARD_MARKS.map((mark) => panelLegendLabel(mark));
    expect(labels).toHaveLength(11);
    expect(labels[0]).toBe("1 Hood");
    expect(labels[2]).toBe("3 Driver doors");
    expect(labels[10]).toBe("11 Rear bumper");

    const packageLine = wholeTruckPackageCopy();
    expect(packageLine).toBe(`The package is ${labels.join(", ")}.`);
    expect(PUBLIC_COPY.board.wholeTruckLead).not.toContain(packageLine);
    expect(PUBLIC_COPY.board.wholeTruckLead).toContain(
      "Nothing is charged on this page.",
    );
    expect(PUBLIC_COPY.board.wholeTruckHeading).toBe("Whole truck — $120,000");
    expect(PUBLIC_COPY.board.wholeTruckLead.toLowerCase()).not.toMatch(
      /\blease\b/,
    );

    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(PUBLIC_COPY.board.wholeTruckLead);
    expect(md).not.toContain("The package is 1 Hood");

    const form = readFileSync(
      join(process.cwd(), "src/components/WholeTruckIntentForm.tsx"),
      "utf8",
    );
    expect(form).toContain("wholeTruckPackageCopy()");
    expect(form).toContain('data-testid="whole-truck-package"');

    const action = readFileSync(
      join(process.cwd(), "src/app/actions/intent.ts"),
      "utf8",
    );
    expect(action).toContain("wholeTruckPackageCopy()");
  });

  test("homepage whole-truck lead is one sentence, not the package dump", async ({
    page,
  }) => {
    await page.goto("/");
    const lead = page.getByTestId("whole-truck-lead");
    await expect(lead).toBeVisible();
    await expect(lead).toHaveText(PUBLIC_COPY.board.wholeTruckLead);
    await expect(lead).not.toContainText(wholeTruckPackageCopy());
    await expect(lead).not.toContainText("1 Hood");
    await expect(lead).not.toContainText("11 Rear bumper");
    await expect(page.getByTestId("whole-truck-heading")).toHaveText(
      "Whole truck — $120,000",
    );
    await expect(page.getByTestId("whole-truck-intent-form")).toHaveCount(0);
    await expect(page.getByTestId("floor-amount")).toHaveText("$58,000");
    await expect(page.getByTestId("goal-amount")).toHaveText("$120,000");
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("The package is 1 Hood");
    expect(html).toContain(PUBLIC_COPY.board.wholeTruckLead);
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
