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
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.29 — opening prices on cards stay formatUsd from campaign.ts.
 * No third money number. FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

test.describe("slice 16.29: card opening prices use formatUsd", () => {
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

  test("card source formats openingUsd from campaign.ts", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/home/HomePanelsSection.tsx"),
      "utf8",
    );
    expect(src).toMatch(/formatUsd,\s*isEtchable\s*\} from ["']@\/lib\/campaign["']/);
    expect(src).toContain("Opens at {formatUsd(panel.openingUsd)}");
    expect(src).not.toMatch(/\$\d/);

    const door = PANELS.find((panel) => panel.id === "driver-door");
    expect(door?.openingUsd).toBe(2500);
    expect(formatUsd(door!.openingUsd)).toBe("$2,500");
    const hood = PANELS.find((panel) => panel.id === "hood");
    expect(hood?.openingUsd).toBe(2500);
    expect(formatUsd(hood!.openingUsd)).toBe("$2,500");
  });

  test("homepage cards show formatUsd opening prices", async ({ page }) => {
    await page.goto("/");
    for (const panel of PANELS) {
      const card = page.getByTestId(`panel-${panel.id}`);
      await expect(card).toContainText(`Opens at ${formatUsd(panel.openingUsd)}`);
    }
    await expect(page.getByTestId("panel-driver-door")).toContainText(
      "Opens at $2,500",
    );
    await expect(page.getByTestId("panel-hood")).toContainText("Opens at $2,500");
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
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
