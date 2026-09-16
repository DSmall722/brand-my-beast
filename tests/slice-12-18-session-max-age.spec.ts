import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  ACCOUNT_SESSION_IDLE_COPY,
  SESSION_MAX_AGE_DAYS,
  SESSION_MAX_AGE_SECONDS,
} from "../src/lib/auth/session";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 12.18 — session max-age documented + idle timeout copy on /account.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.18: session max-age + account idle copy", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("SESSION_MAX_AGE is 7 days and wired into Auth.js", () => {
    expect(SESSION_MAX_AGE_DAYS).toBe(7);
    expect(SESSION_MAX_AGE_SECONDS).toBe(7 * 24 * 60 * 60);
    expect(ACCOUNT_SESSION_IDLE_COPY).toContain("7 days");
    expect(ACCOUNT_SESSION_IDLE_COPY).toContain("idle window");
    expect(ACCOUNT_SESSION_IDLE_COPY.toLowerCase()).not.toMatch(/\blease\b/);
    expect(ACCOUNT_SESSION_IDLE_COPY).not.toMatch(/CLOSE_AT/);
    expect(ACCOUNT_SESSION_IDLE_COPY.toLowerCase()).not.toMatch(/stripe/);

    const authSrc = readFileSync(
      join(process.cwd(), "src/lib/auth/index.ts"),
      "utf8",
    );
    expect(authSrc).toContain("SESSION_MAX_AGE_SECONDS");
    expect(authSrc).toMatch(/maxAge:\s*SESSION_MAX_AGE_SECONDS/);

    const p2 = readFileSync(join(process.cwd(), "P2.md"), "utf8");
    expect(p2).toMatch(/Session max-age \(slice 12\.18\)/);
    expect(p2).toContain("7 days");
    expect(p2).toContain("SESSION_MAX_AGE_SECONDS");
  });

  test("account page shows idle timeout copy", async ({ page }) => {
    await signIn(page, "bidder-a@example.com");
    const idle = page.getByTestId("account-session-idle");
    await expect(idle).toBeVisible();
    await expect(idle).toHaveText(ACCOUNT_SESSION_IDLE_COPY);
    await expect(idle).toHaveAttribute(
      "data-session-max-age-days",
      String(SESSION_MAX_AGE_DAYS),
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toContain("dennard");
  });
});
