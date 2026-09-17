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

/**
 * Slice 16.0f — /operator/waitlist Whole-truck column + optional filter.
 * No public header link. CLOSE_AT null. No Stripe. SEATS_OPEN untouched.
 */

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 16.0f: operator waitlist whole-truck column", () => {
  test.describe.configure({ mode: "serial" });

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

  test("public homepage has no operator waitlist header link", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("operator-waitlist-link")).toHaveCount(0);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
  });

  test("operator sees Whole-truck column and optional filter", async ({
    page,
    request,
  }) => {
    const stamp = Date.now();
    const yesEmail = `slice160f-yes-${stamp}@example.com`;
    const noEmail = `slice160f-no-${stamp}@example.com`;

    const yesJoin = await request.post("/api/waitlist", {
      data: { email: yesEmail, wantWholeTruck: true },
    });
    expect(yesJoin.status()).toBe(201);
    const noJoin = await request.post("/api/waitlist", {
      data: { email: noEmail, wantWholeTruck: false },
    });
    expect(noJoin.status()).toBe(201);

    await signIn(page, "operator@example.com");
    await page.goto("/operator/waitlist");
    await expect(page.getByTestId("operator-waitlist")).toBeVisible();
    await expect(page.getByTestId("operator-waitlist")).toHaveAttribute(
      "data-whole-truck-filter",
      "all",
    );

    const yesRow = page.getByTestId(`operator-waitlist-row-${yesEmail}`);
    const noRow = page.getByTestId(`operator-waitlist-row-${noEmail}`);
    await expect(yesRow).toBeVisible();
    await expect(noRow).toBeVisible();
    await expect(yesRow.getByTestId("operator-waitlist-whole-truck")).toHaveText(
      "Whole-truck: Yes",
    );
    await expect(noRow.getByTestId("operator-waitlist-whole-truck")).toHaveText(
      "Whole-truck: No",
    );

    await expect(
      page.getByTestId("operator-waitlist-whole-truck-filter"),
    ).toBeVisible();
    await page.getByTestId("operator-waitlist-filter-yes").click();
    await expect(page.getByTestId("operator-waitlist")).toHaveAttribute(
      "data-whole-truck-filter",
      "yes",
    );
    await expect(yesRow).toBeVisible();
    await expect(noRow).toHaveCount(0);

    await page.getByTestId("operator-waitlist-filter-no").click();
    await expect(page.getByTestId("operator-waitlist")).toHaveAttribute(
      "data-whole-truck-filter",
      "no",
    );
    await expect(noRow).toBeVisible();
    await expect(yesRow).toHaveCount(0);

    await page.getByTestId("operator-waitlist-filter-all").click();
    await expect(page.getByTestId("operator-waitlist")).toHaveAttribute(
      "data-whole-truck-filter",
      "all",
    );
    await expect(yesRow).toBeVisible();
    await expect(noRow).toBeVisible();

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
