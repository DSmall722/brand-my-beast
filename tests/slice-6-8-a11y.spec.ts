import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
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

async function assertNoSeriousAxe(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    serious,
    `${label} axe serious/critical: ${JSON.stringify(
      serious.map((v) => ({ id: v.id, nodes: v.nodes.length })),
      null,
      2,
    )}`,
  ).toEqual([]);
}

/**
 * Slice 6.8 — keyboard / labels / contrast on /, seat, operator.
 * Does not claim 6.9 hero clip work. Does not rewrite PUBLIC_COPY.
 */
test.describe("slice 6.8: keyboard / labels / contrast", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
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

  test("home has skip link, labeled waitlist, and no serious axe hits", async ({
    page,
  }) => {
    await page.goto("/");
    const skip = page.locator("a.skip-link");
    await expect(skip).toHaveAttribute("href", "#main-content");
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByTestId("waitlist-email")).toHaveAttribute(
      "id",
      "waitlist-email",
    );
    await expect(page.locator('label[for="waitlist-email"]')).toBeAttached();

    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);

    await assertNoSeriousAxe(page, "home");
  });

  test("seat page is keyboard-reachable and axe-clean", async ({ page }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.locator("a.skip-link")).toHaveAttribute(
      "href",
      "#main-content",
    );

    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    const outline = await focused.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(outline).not.toBe("none");

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);

    await assertNoSeriousAxe(page, "seat");
  });

  test("operator page is labeled and axe-clean when signed in", async ({
    page,
  }) => {
    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("operator-approvals")).toBeVisible();
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByTestId("operator-campaign-locks")).toHaveAttribute(
      "aria-label",
      /campaign locks/i,
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");

    await assertNoSeriousAxe(page, "operator");
  });
});
