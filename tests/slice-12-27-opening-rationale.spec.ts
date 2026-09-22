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
import {
  OPENING_BID_RATIONALE,
  OPENING_BID_RATIONALE_SOURCE,
} from "../src/lib/opening-bid-rationale";

/**
 * Slice 12.27 — opening-bid rationale one-liner on the seat from RULES.md only.
 */
test.describe("slice 12.27: opening-bid rationale from RULES.md", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
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

  test("rationale is RULES.md only — floor is not the sum of openings", () => {
    expect(OPENING_BID_RATIONALE_SOURCE).toBe("RULES.md");
    expect(OPENING_BID_RATIONALE).toContain(
      "The floor is not the sum of openings",
    );
    expect(OPENING_BID_RATIONALE).toContain("$58,000");
    expect(OPENING_BID_RATIONALE.toLowerCase()).not.toMatch(/\blease\b/);

    const rules = readFileSync(join(process.cwd(), "RULES.md"), "utf8");
    expect(rules).toContain("The floor is not the sum of openings");
    expect(rules).toContain("$58,000");
  });

  test("seat page shows the one-liner sourced from RULES.md", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("opening-bid-rationale")).toHaveCount(0);
    await expect(page.getByTestId("seat-lead")).toContainText("Current Bid $2,500");

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$120,000");
  });
});
