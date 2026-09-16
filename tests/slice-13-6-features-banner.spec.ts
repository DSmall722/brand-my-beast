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
 * Slice 13.6 — FEATURES.md banner: “not the build order.”
 * CLOSE_AT null. No Stripe. Not on the public homepage.
 */
const FEATURES = join(process.cwd(), "FEATURES.md");
const SLICES = join(process.cwd(), "SLICES.md");

test.describe("slice 13.6: FEATURES.md not the build order", () => {
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

  test("FEATURES.md banner points at SLICES as the only build order", () => {
    expect(existsSync(FEATURES)).toBe(true);
    const text = readFileSync(FEATURES, "utf8");
    expect(text).toMatch(/not the build order/i);
    expect(text).toMatch(/SLICES\.md/);
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/CLOSE_AT/);
    expect(text.toLowerCase()).not.toContain("gmail.com");

    const slices = readFileSync(SLICES, "utf8");
    expect(slices).toMatch(/only build order/i);
  });
});
