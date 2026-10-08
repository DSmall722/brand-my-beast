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
    expect(CLOSE_AT).toBe("2026-11-02T17:00:00.000Z");
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
    expect(names.some((name) => name !== "stripe" && name.toLowerCase().includes("stripe"))).toBe(
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
    const email = `focus38-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    await page.goto("/#contactus");
    await page.getByTestId("waitlist-email").fill(email);
    await page.getByTestId("waitlist-submit").click();
    const status = page.getByTestId("waitlist-status");
    await expect(status).toHaveText(
      new RegExp(
        `^(?:${escapeRegExp(PUBLIC_COPY.waitlist.success)}|${escapeRegExp(PUBLIC_COPY.waitlist.already)})$`,
      ),
    );
    await expect(status).toBeFocused();
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("an API error stays on the field alert and does not focus status", async ({
    page,
  }) => {
    await page.route("**/api/waitlist", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: PUBLIC_COPY.waitlist.failed }),
      }),
    );
    await page.goto("/#contactus");
    await page
      .getByTestId("waitlist-email")
      .fill(`focus38-err-${Date.now()}@example.com`);
    await page.getByTestId("waitlist-submit").click();
    const field = page.getByTestId("waitlist-email-error");
    await expect(field).toBeVisible();
    await expect(field).toHaveAttribute("role", "alert");
    await expect(field).toHaveText(PUBLIC_COPY.waitlist.failed);
    await expect(page.getByTestId("waitlist-status")).not.toBeFocused();
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
