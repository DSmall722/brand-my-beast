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
import {
  PRE_P3_CHECKLIST,
  assertPreP3ChecklistDoesNotSetCloseAt,
} from "../src/lib/pre-p3-checklist";

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 11.8 — Pre-P3 checklist on /operator.
 * LLC, terms, Resend, Stripe not wired. Checkboxes do not set CLOSE_AT.
 */
test.describe("slice 11.8: Pre-P3 checklist on /operator", () => {
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

  test("checklist ids cover LLC, terms, Resend, Stripe not wired", () => {
    const ids = PRE_P3_CHECKLIST.map((item) => item.id);
    expect(ids).toEqual(["llc", "terms", "resend", "stripe-not-wired"]);
    expect(
      assertPreP3ChecklistDoesNotSetCloseAt(ids),
    ).toBe(true);
    expect(CLOSE_AT).toBeNull();
  });

  test("operator can toggle every box without setting CLOSE_AT", async ({
    page,
  }) => {
    await signIn(page, "operator@example.com");
    await page.goto("/operator");

    const panel = page.getByTestId("pre-p3-checklist");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("data-auction-clock", "unset");
    await expect(page.getByTestId("pre-p3-close-at-fence")).toContainText(
      "Auction clock stays unset",
    );
    await expect(page.getByTestId("pre-p3-close-at-fence")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("pre-p3-close-at-fence")).toContainText(
      "$120,000",
    );

    for (const item of PRE_P3_CHECKLIST) {
      const box = page.getByTestId(`pre-p3-check-${item.id}`);
      await expect(box).toBeVisible();
      await box.check();
      await expect(box).toBeChecked();
    }

    await expect(panel).toHaveAttribute("data-auction-clock", "unset");
    expect(CLOSE_AT).toBeNull();

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html.toLowerCase()).not.toContain("gmail.com");
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toContain("close_at");
  });
});
