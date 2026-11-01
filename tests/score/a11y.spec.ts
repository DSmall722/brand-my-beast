import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  { id: "home", path: "/", ready: "main" },
  { id: "panel", path: "/panels/hood", ready: "[data-testid='panel-intent-page']" },
  { id: "faq", path: "/", ready: "[data-testid='questions-section']" },
  { id: "terms", path: "/terms", ready: "[data-testid='terms-page']" },
] as const;

test.describe("score a11y", () => {
  for (const row of PAGES) {
    test(`axe ${row.id} ${row.path}`, async ({ page }, testInfo) => {
      await page.goto(row.path);
      await expect(page.locator(row.ready).first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const summary = {
        id: row.id,
        path: row.path,
        violations: results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
        })),
      };
      await testInfo.attach("axe", {
        body: JSON.stringify(summary),
        contentType: "application/json",
      });
    });
  }
});
