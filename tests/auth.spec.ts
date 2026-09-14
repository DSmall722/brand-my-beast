import { expect, test } from "@playwright/test";

test.describe("P2 Auth.js wiring", () => {
  test("auth status reports test mode without capture or close clock", async ({
    request,
  }) => {
    const res = await request.get("/api/auth/status");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("test");
    expect(body.providers).toContain("test-login");
    expect(body.capture).toBe(false);
    expect(body.closeAt).toBeNull();
  });

  test("signs in with test credentials and reaches account", async ({
    page,
  }) => {
    await page.goto("/signin");
    await expect(page.getByTestId("test-login-hint")).toBeVisible();
    await page.getByTestId("signin-email").fill("bidder@example.com");
    await page.getByTestId("signin-password").fill("test");
    await page.getByTestId("signin-submit").click();
    await expect(page.getByTestId("account-page")).toBeVisible();
    await expect(page.getByTestId("account-email")).toHaveText(
      "bidder@example.com",
    );
    await expect(page.getByTestId("account-user-id")).toHaveText(
      "test:bidder@example.com",
    );
    await expect(page.getByTestId("intent-only-note")).toContainText(
      "No Stripe capture",
    );
    await expect(page.getByTestId("account-intents")).toBeVisible();
    await expect(page.getByTestId("account-intents-empty")).toBeVisible();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

  test("account redirects anonymous users to sign-in", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/signin/);
    await expect(page.getByTestId("test-signin-form")).toBeVisible();
  });
});
