import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatIntegerUsd,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { minIncrementUsd, nextStandingUsd } from "../src/lib/intent";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.34 — Next-minimum display uses integer dollars only.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();
const WHOLE_DOLLAR = /^\$[\d,]+$/;

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 14.34: next-minimum display integer dollars only", () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("nextStandingUsd and formatIntegerUsd stay whole dollars", () => {
    expect(Number.isInteger(minIncrementUsd(2500))).toBe(true);
    expect(Number.isInteger(nextStandingUsd(2500))).toBe(true);
    expect(nextStandingUsd(2500)).toBe(2750);
    expect(Number.isInteger(nextStandingUsd(3000))).toBe(true);
    expect(nextStandingUsd(3000)).toBe(3300);

    expect(() => minIncrementUsd(2500.5)).toThrow(/integer dollar/i);
    expect(() => nextStandingUsd(2500.5)).toThrow(/integer dollar/i);
    expect(() => formatIntegerUsd(2750.25)).toThrow(/integer dollar/i);
    expect(formatIntegerUsd(2750)).toBe("$2,750");
    expect(formatIntegerUsd(2750)).toMatch(WHOLE_DOLLAR);

    const campaign = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(campaign).toContain("formatIntegerUsd");
    expect(campaign).toContain("Slice 14.34");

    const intent = readFileSync(join(ROOT, "src/lib/intent.ts"), "utf8");
    expect(intent).toContain("Slice 9.2 / 14.34");
    expect(intent).toMatch(/Number\.isInteger\(standingUsd\)/);

    const panel = readFileSync(
      join(ROOT, "src/app/panels/[panelId]/page.tsx"),
      "utf8",
    );
    expect(panel).toContain("formatIntegerUsd(minimum)");
    expect(panel).toContain("panel-minimum");
    expect(panel.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("panel Min next shows whole dollars only", async ({ page }) => {
    await page.goto("/panels/hood");
    const openMin = (await page.getByTestId("panel-minimum").innerText()).trim();
    expect(openMin).toMatch(WHOLE_DOLLAR);
    expect(openMin).not.toMatch(/\.\d/);
    expect(openMin).toBe(formatIntegerUsd(2500));

    await signIn(page, "nextmin1434@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Integer Min Co");
    await page.getByTestId("intent-trade").fill("integer snacks");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    const nextMin = nextStandingUsd(2500);
    expect(Number.isInteger(nextMin)).toBe(true);
    const shown = (await page.getByTestId("panel-minimum").innerText()).trim();
    expect(shown).toMatch(WHOLE_DOLLAR);
    expect(shown).not.toMatch(/\.\d/);
    expect(shown).toBe(formatIntegerUsd(nextMin));
    await expect(page.getByTestId("seat-next-minimum-rule")).toHaveCount(0);
    await expect(page.getByTestId("intent-standing")).toHaveAttribute(
      "min",
      String(nextMin),
    );
    await expect(page.getByTestId("intent-amount-note")).toContainText(
      formatIntegerUsd(nextMin),
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
