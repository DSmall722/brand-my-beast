import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  SEATS_OPEN,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 19.3 — seat lead: if no holder, opening price only.
 * Standing line only when a mark exists. Do not print
 * “Current standing $2,500” on an empty seat.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 19.3: seat lead standing only when a mark exists", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    await request.post("/api/test/seats-open", { data: { reset: true } });
    await request.post("/api/test/reset-intents");
  });

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

  test("SEATS_OPEN is not flipped in campaign.ts", () => {
    const src = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(src).toMatch(/export const SEATS_OPEN/);
    expect(src).toMatch(/export const CLOSE_AT:\s*string\s*\|\s*null\s*=\s*null/);
    expect(process.env.SEATS_OPEN ?? "").not.toMatch(/^(false|0)$/i);
    expect(SEATS_OPEN).toBe(true);
  });

  test("empty hood lead is opening only — no Current standing $2,500", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    const lead = page.getByTestId("seat-lead");
    await expect(lead).toBeVisible();
    await expect(lead).toHaveAttribute("data-has-standing", "false");
    await expect(lead).toContainText("Current Bid $2,500");
    await expect(lead).not.toContainText("Current standing");
    const visible = await page.locator("body").innerText();
    expect(visible).not.toContain("Current standing $2,500");
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("standing line appears only after a mark exists", async ({ page }) => {
    await signIn(page, "slice-19-3@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Seat Lead Co");
    await page.getByTestId("intent-trade").fill("seat lead snacks");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText("not charged");
    const lead = page.getByTestId("seat-lead");
    await expect(lead).toHaveAttribute("data-has-standing", "true");
    await expect(lead).toContainText("Current Bid $2,500");
    await expect(lead).not.toContainText("Current standing");
  });

  test("homepage H1 is unchanged and Notify me stays", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("features.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
