import { expect, test } from "@playwright/test";
import { GOAL_USD, formatUsd } from "../src/lib/campaign";

test.describe("BMB-QA-2-FIX4d vault title and JSON-LD", () => {
  test("home goal marker and Offer schema drop Buyout", async ({ page }) => {
    await page.goto("/");
    const title =
      (await page.getByTestId("vault-marker-goal").getAttribute("title")) ?? "";
    expect(title).not.toMatch(/Buyout/i);
    expect(title).not.toContain("Immortal Etch");
    expect(title).toBe(`Fully funded ${formatUsd(GOAL_USD)}`);

    const raw =
      (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "";
    expect(raw).not.toContain("Buyout");
    expect(raw).not.toContain("Buyout $");
    expect(raw).not.toContain("Immortal Etch");
    expect(raw).toContain('"name":"Fully funded"');
    expect(raw).toContain(formatUsd(GOAL_USD));
  });
});
