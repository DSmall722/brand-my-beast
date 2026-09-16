import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";

/**
 * Slice 13.8 — docs/WRAP-SHOP.md shortlist template.
 * CLOSE_AT null. No Stripe.
 */
const DOC = join(process.cwd(), "docs/WRAP-SHOP.md");

test.describe("slice 13.8: WRAP-SHOP shortlist template", () => {
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

  test("WRAP-SHOP.md is a shortlist template with fences", () => {
    expect(existsSync(DOC)).toBe(true);
    const text = readFileSync(DOC, "utf8");
    expect(text).toContain("13.8");
    expect(text).toMatch(/shortlist/i);
    expect(text).toMatch(/- \[ \]/);
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toContain("hello@brandmybeast.com");
    expect(text).toMatch(/No lease|no lease/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
  });
});
