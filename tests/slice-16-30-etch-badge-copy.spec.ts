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
  isEtchable,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.30 — etch badge stays PUBLIC_COPY (`Immortal Etch Locked`).
 * No $120,000 / $58,000 in the badge. FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

const BADGE = "Immortal Etch Locked";

test.describe("slice 16.30: etch badge stays PUBLIC_COPY", () => {
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

  test("badge string is PUBLIC_COPY, not a new money number", () => {
    expect(PUBLIC_COPY.panels.badgeEtch).toBe(BADGE);
    expect(PUBLIC_COPY.panels.badgeEtch).not.toBe(formatUsd(GOAL_USD));
    expect(PUBLIC_COPY.panels.badgeEtch).not.toContain("$58,000");
    expect(PUBLIC_COPY.panels.badgeEtch).not.toContain("$120,000");

    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(`Badge etch: \`${BADGE}\``);

    const src = readFileSync(
      join(process.cwd(), "src/components/home/HomePanelsSection.tsx"),
      "utf8",
    );
    expect(src).toContain("{PUBLIC_COPY.panels.badgeEtch}");
    expect(src).not.toContain(BADGE);
    expect(src).not.toMatch(/\$\d/);

    const etchable = PANELS.filter((panel) => isEtchable(panel));
    expect(etchable.length).toBeGreaterThan(0);
    expect(etchable.length).toBe(9);
  });

  test("homepage etch badges match PUBLIC_COPY", async ({ page }) => {
    await page.goto("/");
    for (const panel of PANELS) {
      const badge = page.getByTestId(`etch-lock-${panel.id}`);
      if (isEtchable(panel)) {
        await expect(badge).toHaveText(PUBLIC_COPY.panels.badgeEtch);
        await expect(badge).toHaveText(BADGE);
      } else {
        await expect(badge).toHaveCount(0);
      }
    }
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
