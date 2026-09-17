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
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.25 — Sign-out on `/account` uses PUBLIC_COPY.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
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

test.describe("slice 14.25: /account sign-out uses PUBLIC_COPY", () => {
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

  test("PUBLIC_COPY.signIn.signOut is locked; md documents 14.25", () => {
    expect(PUBLIC_COPY.signIn.signOut).toBe("Sign out");
    expect(PUBLIC_COPY.signIn.signOut.toLowerCase()).not.toMatch(/\blease\b/);

    const md = readFileSync(join(ROOT, "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain("14.25");
    expect(md).toContain("`Sign out`");

    const pageSrc = readFileSync(join(ROOT, "src/app/account/page.tsx"), "utf8");
    expect(pageSrc).toContain("PUBLIC_COPY.signIn.signOut");
    expect(pageSrc).not.toMatch(/>\s*Sign out\s*</);
  });

  test("signed-in /account sign-out button shows PUBLIC_COPY label", async ({
    page,
  }) => {
    await signIn(page, "bidder-a@example.com");
    await page.goto("/account");
    const btn = page.getByTestId("account-signout");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText(PUBLIC_COPY.signIn.signOut);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
