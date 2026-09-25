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
 * Slice 12.38 — focus restore after waitlist submit.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.38: waitlist focus restore after submit", () => {
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

  test("WaitlistForm focuses status after submit settles", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/WaitlistForm.tsx"),
      "utf8",
    );
    expect(src).toContain("statusRef");
    expect(src).toContain("statusRef.current?.focus()");
    expect(src).toContain("tabIndex={-1}");
    expect(src).toContain("Slice 12.38");
  });

  test("submitting waitlist moves focus to status message", async ({
    page,
  }) => {
    await page.goto("/#contactus");
    await page.getByTestId("waitlist-email").fill("focus38@example.com");
    await page.getByTestId("waitlist-submit").click();
    await expect(page.getByTestId("waitlist-status")).toContainText(
      /confirm|already|list|fail|try/i,
    );
    await expect(page.getByTestId("waitlist-status")).toBeFocused();
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
