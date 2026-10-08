import { expect, test } from "@playwright/test";

/**
 * BMB-ETCH-DEMOTE-1 — Immortal Etch is one FAQ bonus, not a public pitch.
 */

const BONUS_Q = "Bonus: Immortal Etch";

test.describe("BMB-ETCH-DEMOTE-1", () => {
  test("homepage has no etch section and no Immortal Etch outside the FAQ", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("etch-section")).toHaveCount(0);
    const outsideFaq = await page.locator("#main-content").evaluate((root) => {
      const clone = root.cloneNode(true) as HTMLElement;
      clone.querySelector("#questions")?.remove();
      return clone.textContent ?? "";
    });
    expect(outsideFaq).not.toContain("Immortal Etch");

    const questions = await page
      .locator("#questions dt")
      .allTextContents();
    expect(questions.filter((q) => q.trim() === BONUS_Q)).toHaveLength(1);
    const bonus = page.locator("#questions .questions-item", {
      has: page.locator("dt", { hasText: BONUS_Q }),
    });
    await expect(bonus.locator("dd")).toContainText("$120,000");
  });

  test("steel panel page has no Immortal Etch text", async ({ page }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    const visible = await page.locator("body").innerText();
    expect(visible).not.toContain("Immortal Etch");
  });
});
