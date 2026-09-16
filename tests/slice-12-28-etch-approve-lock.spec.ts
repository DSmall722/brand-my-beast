import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  assertEtchFinishAllowed,
  parseOperatorFinish,
} from "../src/lib/etch-approve-lock";
import { resetIntentStoreForTests } from "../src/lib/intent-store";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

async function resetServerIntents(request: APIRequestContext) {
  const res = await request.post("/api/test/reset-intents");
  expect(res.ok()).toBeTruthy();
}

/**
 * Slice 12.28 — operator cannot approve etch finish while pledged < $120,000.
 */
test.describe("slice 12.28: etch finish approve lock under buyout", () => {
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

  test("assertEtchFinishAllowed blocks etch under buyout", () => {
    expect(parseOperatorFinish("etch")).toBe("etch");
    expect(parseOperatorFinish("wrap")).toBe("wrap");
    expect(parseOperatorFinish(null)).toBe("wrap");

    const locked = assertEtchFinishAllowed({
      finish: "etch",
      pledgedUsd: GOAL_USD - 1,
    });
    expect(locked.ok).toBe(false);
    if (!locked.ok) {
      expect(locked.error).toContain("$120,000");
      expect(locked.error.toLowerCase()).toContain("etch");
    }

    expect(
      assertEtchFinishAllowed({ finish: "wrap", pledgedUsd: 0 }).ok,
    ).toBe(true);
    expect(
      assertEtchFinishAllowed({ finish: "etch", pledgedUsd: GOAL_USD }).ok,
    ).toBe(true);
  });

  test("operator UI locks etch finish select under buyout", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);
    await resetIntentStoreForTests();

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("EtchLockCo");
    await page.getByTestId("intent-trade").fill("etch lock trade");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 15_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText(
      "EtchLockCo",
    );

    const finish = page.locator('[data-testid^="approval-finish-"]').first();
    await expect(finish).toBeVisible();
    await expect(finish).toHaveAttribute("data-etch-unlocked", "false");
    await expect(
      page.locator('[data-testid^="approval-etch-locked-"]').first(),
    ).toContainText("$120,000");

    const select = page
      .locator('[data-testid^="approval-finish-select-"]')
      .first();
    await expect(select.locator('option[value="etch"]')).toBeDisabled();
    await expect(
      page.locator('[data-testid^="imagine-queue-etch-"]').first(),
    ).toBeDisabled();

    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
