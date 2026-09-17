import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
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
import {
  resolveSeatsOpen,
  seatsOpenToggleRejectsDate,
} from "../src/lib/seats-open";
import {
  resetSeatsOpenOverrideForTests,
  setSeatsOpenOverride,
} from "../src/lib/seats-open-store";

/**
 * Slice 14.18 — Operator toggle for SEATS_OPEN does not set a date.
 * CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const ROOT = process.cwd();

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 14.18: operator SEATS_OPEN toggle sets no date", () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
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

  test("toggle helpers reject dates and leave CLOSE_AT null", () => {
    resetSeatsOpenOverrideForTests();
    expect(seatsOpenToggleRejectsDate(null)).toBe(true);
    expect(seatsOpenToggleRejectsDate("")).toBe(true);
    expect(seatsOpenToggleRejectsDate("2026-10-01")).toBe(false);
    expect(CLOSE_AT).toBeNull();

    const closed = setSeatsOpenOverride(false);
    expect(closed.ok).toBe(true);
    if (closed.ok) expect(closed.seatsOpen).toBe(false);
    expect(resolveSeatsOpen()).toBe(false);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);

    const opened = setSeatsOpenOverride(true);
    expect(opened.ok).toBe(true);
    expect(resolveSeatsOpen()).toBe(true);
    expect(CLOSE_AT).toBeNull();
    resetSeatsOpenOverrideForTests();
  });

  test("operator toggle UI has no date inputs", () => {
    const src = readFileSync(
      join(ROOT, "src/components/OperatorSeatsOpenToggle.tsx"),
      "utf8",
    );
    expect(src).toContain("operator-seats-open-toggle");
    expect(src).toContain("Open seats");
    expect(src).toContain("Close seats");
    expect(src).not.toMatch(/type=["']date["']/);
    expect(src).not.toMatch(/name=["']date["']/);
    expect(src).not.toMatch(/CLOSE_AT\s*=/);
    expect(src).toContain("does not set a date");
  });

  test("operator can close seats without setting a date", async ({ page }) => {
    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("operator-approvals")).toBeVisible();
    await expect(page.getByTestId("operator-seats-open-toggle")).toBeVisible();
    await expect(page.getByTestId("operator-lock-close")).toHaveText("unset");

    await page.getByTestId("operator-seats-open-off").click();
    await expect(page.getByTestId("operator-seats-open-message")).toContainText(
      /waitlist only/i,
    );
    await expect(page.getByTestId("operator-seats-open-status")).toHaveAttribute(
      "data-seats-open",
      "false",
    );
    await expect(page.getByTestId("operator-lock-close")).toHaveText("unset");
    expect(CLOSE_AT).toBeNull();

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
