import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { isOperatorEmail } from "../src/lib/auth/operator";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 7.5 — `/operator/waitlist` lists waitlist_signups.
 * Auth + OPERATOR_EMAILS. No public header link. No export to X.
 */
test.describe("slice 7.5: operator waitlist roster", () => {
  test("campaign money fences stay locked", () => {
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

  test("live OPERATOR_EMAILS gate denies strangers", () => {
    expect(
      isOperatorEmail("stranger@not-on-list.com", {
        AUTH_MODE: "live",
        OPERATOR_EMAILS: "ops@brandmybeast.com",
      }),
    ).toBe(false);
    expect(
      isOperatorEmail("ops@brandmybeast.com", {
        AUTH_MODE: "live",
        OPERATOR_EMAILS: "ops@brandmybeast.com",
      }),
    ).toBe(true);
  });

  test("public homepage has no operator waitlist header link", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("operator-waitlist-link")).toHaveCount(0);
    await expect(page.getByTestId("approvals-nav-link")).toHaveCount(0);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
  });

  test("unsigned visitor is sent to sign-in", async ({ page }) => {
    await page.goto("/operator/waitlist");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("operator sees waitlist emails; no off-site blast controls", async ({
    page,
    request,
  }) => {
    const email = `slice75-${Date.now()}@example.com`;
    const join = await request.post("/api/waitlist", {
      data: { email },
    });
    expect([200, 201]).toContain(join.status());

    await signIn(page, "operator@example.com");
    await page.goto("/operator/waitlist");
    await expect(page.getByTestId("operator-waitlist")).toBeVisible();
    await expect(page.getByTestId("operator-waitlist-list")).toContainText(
      email,
    );
    await expect(page.getByTestId("operator-waitlist")).toContainText(
      formatUsd(FLOOR_USD),
    );
    await expect(page.getByTestId("operator-waitlist")).toContainText(
      formatUsd(GOAL_USD),
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
    await expect(
      page.getByRole("button", { name: /export|tweet|share|blast/i }),
    ).toHaveCount(0);
    await expect(page.getByTestId("operator-waitlist-export")).toHaveCount(0);

    await page.goto("/operator");
    await expect(page.getByTestId("operator-waitlist-link")).toBeVisible();
    await page.getByTestId("operator-waitlist-link").click();
    await expect(page.getByTestId("operator-waitlist")).toBeVisible();
  });
});
