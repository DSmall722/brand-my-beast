import { expect, test } from "@playwright/test";
import { enabledAuthProviders } from "../src/lib/auth/mode";

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
    expect(body.providers).not.toContain("resend");
    expect(body.capture).toBe(false);
    expect(body.closeAt).toBeNull();
  });

  test("slice 5.1: live mode enables resend, not test-login", () => {
    expect(
      enabledAuthProviders({
        AUTH_MODE: "live",
        RESEND_API_KEY: "re_test",
        DATABASE_URL: "postgres://localhost/bmb",
      }),
    ).toEqual(["resend"]);
    expect(
      enabledAuthProviders({
        AUTH_MODE: "test",
        RESEND_API_KEY: "re_test",
        DATABASE_URL: "postgres://localhost/bmb",
      }),
    ).toEqual(["test-login"]);
    expect(
      enabledAuthProviders({
        AUTH_MODE: "live",
        RESEND_API_KEY: "re_test",
        DATABASE_URL: "postgres://localhost/bmb",
        AUTH_ENABLE_TEST_LOGIN: "1",
      }),
    ).toEqual(["test-login", "resend"]);
  });

  test("signs in with test credentials and reaches account", async ({
    page,
  }) => {
    await page.goto("/signin");
    await expect(page.getByTestId("test-login-hint")).toHaveCount(0);
    await expect(page.getByTestId("magic-link-form")).toHaveCount(0);
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
    await expect(page.getByTestId("account-waitlist-absent")).toBeVisible();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toContain("dennard");
  });

  test("slice 5.3: waitlist email keeps its row after sign-in", async ({
    page,
    request,
  }) => {
    const email = `slice53-${Date.now()}@example.com`;
    const created = await request.post("/api/waitlist", {
      data: { email },
    });
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({
      ok: true,
      status: "created",
    });

    await page.goto("/signin");
    await page.getByTestId("signin-email").fill(email);
    await page.getByTestId("signin-password").fill("test");
    await page.getByTestId("signin-submit").click();
    await expect(page.getByTestId("account-page")).toBeVisible();
    const row = page.getByTestId("account-waitlist-row");
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute("data-waitlist-email", email);
    await expect(row).toHaveAttribute(
      "data-waitlist-user-id",
      `test:${email}`,
    );
    const createdAt = await row.getAttribute("data-waitlist-created-at");
    expect(createdAt).toBeTruthy();
    await expect(page.getByTestId("account-page")).toContainText("$58,000");
    await expect(page.getByTestId("account-page")).toContainText("$120,000");

    const exists = await request.post("/api/waitlist", {
      data: { email },
    });
    expect(exists.status()).toBe(200);
    expect(await exists.json()).toMatchObject({
      ok: true,
      status: "exists",
    });

    await page.goto("/account");
    await expect(page.getByTestId("account-waitlist-row")).toHaveAttribute(
      "data-waitlist-created-at",
      createdAt!,
    );
    await expect(page.getByTestId("account-waitlist-row")).toHaveAttribute(
      "data-waitlist-user-id",
      `test:${email}`,
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toContain("dennard");
    expect(html).not.toContain("FEATURES.md");
  });

  test("account redirects anonymous users to sign-in", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/signin/);
    await expect(page.getByTestId("test-signin-form")).toBeVisible();
  });

  test("slice 5.1: check-email page has no lease or personal name", async ({
    page,
  }) => {
    await page.goto("/signin/check-email");
    await expect(page.getByTestId("check-email-page")).toBeVisible();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toContain("dennard");
    expect(html).not.toContain("FEATURES.md");
  });
});
