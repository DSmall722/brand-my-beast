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
import {
  formatWaitlistCountLabel,
  pingDatabase,
} from "../src/lib/operator-status";

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 11.5 — operator status panel: DB ping + waitlist count.
 * Auth-gated on `/operator`. No public URL / homepage link.
 */
test.describe("slice 11.5: operator status panel", () => {
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

  test("memory-mode DB ping reports Memory (CI)", async () => {
    const ping = await pingDatabase({ ...process.env, DATABASE_URL: "" });
    expect(ping.status).toBe("memory");
    expect(ping.label).toBe("Memory (CI)");
    expect(formatWaitlistCountLabel(0)).toBe("0 signups");
    expect(formatWaitlistCountLabel(1)).toBe("1 signup");
    expect(formatWaitlistCountLabel(2)).toBe("2 signups");
  });

  test("operator sees DB ping + waitlist count; public home has no link", async ({
    page,
    request,
    browser,
  }) => {
    const stamp = Date.now();
    const emails = [
      `status-a-${stamp}@example.com`,
      `status-b-${stamp}@example.com`,
    ];
    for (const email of emails) {
      const res = await request.post("/api/waitlist", { data: { email } });
      expect(res.status()).toBe(201);
    }

    expect(isOperatorEmail("operator@example.com")).toBe(true);
    await signIn(page, "operator@example.com");
    await page.goto("/operator");

    const panel = page.getByTestId("operator-status-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("data-db-status", "memory");
    await expect(page.getByTestId("operator-status-db")).toHaveText(
      "Memory (CI)",
    );
    // Count is cumulative in the shared memory process — at least our two.
    const countText = await page
      .getByTestId("operator-status-waitlist-count")
      .innerText();
    const countMatch = countText.match(/^(\d+) signup/);
    expect(countMatch).not.toBeNull();
    expect(Number(countMatch![1])).toBeGreaterThanOrEqual(2);

    // No public URL / homepage surface for this panel.
    const publicPage = await browser.newPage();
    await publicPage.goto("/");
    await expect(
      publicPage.getByTestId("operator-status-panel"),
    ).toHaveCount(0);
    await expect(
      publicPage.locator('a[href="/operator/status"], a[href="/status"]'),
    ).toHaveCount(0);
    const homeHtml = await publicPage.content();
    expect(homeHtml).not.toMatch(/\blease\b/i);
    expect(homeHtml.toLowerCase()).not.toContain("gmail.com");
    await publicPage.close();

    const robots = await page.request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toContain("Disallow: /operator");
  });
});
