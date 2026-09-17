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
 * Slice 16.0g — drop waitlist-signin-intent post-submit CTA.
 * Keep browse panels / stay on the list. CLOSE_AT null. No Stripe.
 */

test.describe("slice 16.0g: drop waitlist-signin-intent CTA", () => {
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

  test("post-submit next has browse panels only; signin-intent gone", async ({
    page,
    request,
  }) => {
    const email = `slice160g-${Date.now()}@example.com`;
    const created = await request.post("/api/waitlist", { data: { email } });
    expect(created.status()).toBe(201);

    await page.goto("/");
    await page.getByTestId("waitlist-email").fill(email);
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/waitlist") &&
          res.request().method() === "POST",
      ),
      page.getByTestId("waitlist-submit").click(),
    ]);
    expect(response.status()).toBe(200);
    await expect(page.getByTestId("waitlist-status")).toHaveText(
      PUBLIC_COPY.waitlist.already,
    );
    await expect(page.getByTestId("waitlist-next")).toBeVisible();
    await expect(page.getByTestId("waitlist-browse-panels")).toHaveAttribute(
      "href",
      "/#panels",
    );
    await expect(page.getByTestId("waitlist-signin-intent")).toHaveCount(0);
    await expect(page.getByTestId("waitlist-next")).toContainText(
      "stay on the list",
    );
    await expect(page.getByTestId("waitlist-next")).toContainText(
      "cards are not charged yet",
    );
    await expect(page.getByTestId("waitlist-next")).not.toContainText(
      "sign in to list an intent",
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
