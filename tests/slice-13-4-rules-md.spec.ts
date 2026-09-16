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
 * Slice 13.4 — RULES.md adds failed-winner + one-approved-per-panel.
 * CLOSE_AT null. No Stripe.
 */
const RULES = join(process.cwd(), "RULES.md");

test.describe("slice 13.4: RULES.md failed-winner + one approved", () => {
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

  test("RULES.md documents failed-winner and one-approved-per-panel", () => {
    expect(existsSync(RULES)).toBe(true);
    const text = readFileSync(RULES, "utf8");
    expect(text).toContain("13.4");
    expect(text).toMatch(/Failed-winner/i);
    expect(text).toMatch(/one approved standing per panel/i);
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
  });
});
