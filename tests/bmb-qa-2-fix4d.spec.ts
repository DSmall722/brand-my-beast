import { expect, test } from "@playwright/test";
import { FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";

test.describe("BMB-QA-2-FIX4d vault title and JSON-LD", () => {
  test("home goal marker and Offer schema drop Buyout", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("vault-marker-goal")).toHaveCount(0);
    const title =
      (await page.getByTestId("vault-marker-floor").getAttribute("title")) ?? "";
    expect(title).not.toMatch(/Buyout/i);
    expect(title).not.toContain("Fully funded");
    expect(title).toBe(`Floor ${formatUsd(FLOOR_USD)}`);

    const raw =
      (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "";
    expect(raw).not.toContain("Buyout");
    expect(raw).not.toContain("Fully funded");
    expect(raw).not.toContain("Immortal Etch");
    expect(raw).not.toContain(formatUsd(GOAL_USD));
    expect(raw).toContain(formatUsd(FLOOR_USD));
  });
});
