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
 * Slice 12.49 — SECURITY.md reports to hello@. No personal inbox.
 * CLOSE_AT null. No Stripe.
 */
const SECURITY = join(process.cwd(), "SECURITY.md");

test.describe("slice 12.49: SECURITY.md reports to hello@", () => {
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

  test("SECURITY.md points at hello@brandmybeast.com only", () => {
    expect(existsSync(SECURITY)).toBe(true);
    const text = readFileSync(SECURITY, "utf8");
    expect(text).toContain("12.49");
    expect(text).toContain("hello@brandmybeast.com");
    expect(text).toMatch(/\$58,000|FLOOR_USD/);
    expect(text).toMatch(/\$120,000|GOAL_USD/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).toMatch(/No lease|no lease/i);
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
  });
});
