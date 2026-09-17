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
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.0e — WaitlistForm checkbox + POST wantWholeTruck.
 * Submit still 201. Pledged on `/` stays $0. No H1 rewrite.
 * CLOSE_AT null. No Stripe. SEATS_OPEN untouched.
 */

const LOCKED_H1 =
  "Put your brand on the truck people already photograph.";

test.describe("slice 16.0e: WaitlistForm whole-truck checkbox", () => {
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

  test("checkbox + submit 201; pledged stays $0; H1 unchanged", async ({
    page,
  }) => {
    const email = `form-16e-${Date.now()}@example.com`;
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(LOCKED_H1);
    await expect(page.getByTestId("raised-amount")).toHaveText(formatUsd(0));

    const checkbox = page.getByTestId("waitlist-want-whole-truck");
    await expect(checkbox).toBeVisible();
    await expect(page.getByTestId("waitlist-want-whole-truck-hint")).toHaveText(
      PUBLIC_COPY.waitlist.wholeTruckCheckboxHint,
    );
    await expect(
      page.locator("label[for='waitlist-want-whole-truck']"),
    ).toContainText(PUBLIC_COPY.waitlist.wholeTruckCheckboxLabel);

    await page.getByTestId("waitlist-email").fill(email);
    await checkbox.check();

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/waitlist") &&
          res.request().method() === "POST",
      ),
      page.getByTestId("waitlist-submit").click(),
    ]);
    expect(response.status()).toBe(201);
    const post = response.request().postDataJSON() as {
      email?: string;
      wantWholeTruck?: boolean;
    };
    expect(post.email).toBe(email);
    expect(post.wantWholeTruck).toBe(true);

    await expect(page.getByTestId("waitlist-status")).toContainText(
      PUBLIC_COPY.waitlist.success,
    );
    await expect(page.getByTestId("raised-amount")).toHaveText(formatUsd(0));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(LOCKED_H1);

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
