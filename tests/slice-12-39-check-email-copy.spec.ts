import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 12.39 — /signin/check-email uses PUBLIC_COPY success line.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.39: check-email PUBLIC_COPY success line", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
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

  test("PUBLIC_COPY.signIn carries check-email success line", () => {
    expect(PUBLIC_COPY.signIn.checkEmailHeading).toBe("Check your email");
    expect(PUBLIC_COPY.signIn.checkEmailSuccess).toContain("sign-in link");
    expect(PUBLIC_COPY.signIn.checkEmailSuccess.toLowerCase()).not.toMatch(
      /\blease\b/,
    );
    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(PUBLIC_COPY.signIn.checkEmailSuccess);
  });

  test("check-email page renders PUBLIC_COPY success line", async ({
    page,
  }) => {
    await page.goto("/signin/check-email");
    await expect(page.getByTestId("check-email-page")).toBeVisible();
    await expect(page.getByTestId("check-email-heading")).toHaveText(
      PUBLIC_COPY.signIn.checkEmailHeading,
    );
    await expect(page.getByTestId("check-email-success")).toHaveText(
      PUBLIC_COPY.signIn.checkEmailSuccess,
    );
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("test login");
  });
});
