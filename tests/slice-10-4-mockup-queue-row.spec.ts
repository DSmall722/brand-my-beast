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
import { completeSameDayMockup, previewKeyFor } from "../src/lib/mockup";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 10.4 — mockup queue row on /operator. No billable Imagine call.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 10.4: mockup queue row", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe and no Imagine SDK", () => {
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
    expect(
      names.some((name) =>
        /imagine|openai|replicate|fal-ai|stability/i.test(name),
      ),
    ).toBe(false);
  });

  test("unit: same-day mockup stays placeholder ready — no external call", () => {
    const key = previewKeyFor({ panelId: "hood", brandLabel: "Queue Co" });
    const mockup = completeSameDayMockup({
      id: "mock_queue",
      bidId: "bid_queue",
      panelId: "hood",
      brandLabel: "Queue Co",
      tradeLabel: "queue snacks",
      finish: "wrap",
      previewKey: key,
      createdAt: "2026-09-16T00:00:00.000Z",
    });
    expect(mockup.status).toBe("ready");
    expect(mockup.readyAt).toBe("2026-09-16T00:00:00.000Z");
    expect(mockup.previewKey).toMatch(/^imagine-[0-9a-f]+$/);
  });

  test("operator: queue wrap mockup adds a queue row — not billed", async ({
    browser,
  }) => {
    const bidder = await browser.newPage();
    await signIn(bidder, "mockup104@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Queue Face Co");
    await bidder.getByTestId("intent-trade").fill("mockup queue snacks");
    await bidder.getByTestId("intent-standing").fill("2500");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await bidder.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator");
    await expect(operator.getByTestId("mockup-queue")).toBeVisible();
    await expect(operator.getByTestId("mockup-queue-lead")).toContainText(
      "No Imagine API call",
    );
    await expect(operator.getByTestId("mockup-queue-empty")).toBeVisible();

    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Queue Face Co",
    );
    await operator.locator('[data-testid^="imagine-queue-wrap-"]').first().click();
    await expect(
      operator.locator('[data-testid^="imagine-preview-"]').first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(operator.getByTestId("imagine-message")).toContainText(
      "not billed",
    );

    await expect(operator.getByTestId("mockup-queue-empty")).toHaveCount(0);
    const row = operator.getByTestId(/mockup-queue-row-/).first();
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute("data-finish", "wrap");
    await expect(row).toHaveAttribute("data-status", "ready");
    await expect(row).toContainText("Queue Face Co");
    await expect(row).toContainText("Placeholder — not billed");

    const html = await operator.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    await operator.close();
  });
});
