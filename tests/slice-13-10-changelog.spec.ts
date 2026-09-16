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
 * Slice 13.10 — docs/CHANGELOG.md lists last 20 merged slice ids.
 * CLOSE_AT null. No Stripe.
 */
const DOC = join(process.cwd(), "docs/CHANGELOG.md");

const EXPECTED_SLICES = [
  "13.9",
  "13.8",
  "13.7",
  "13.6",
  "13.5",
  "13.4",
  "13.3",
  "13.2",
  "13.1",
  "12.50",
  "12.49",
  "12.48",
  "12.47",
  "12.46",
  "12.45",
  "12.44",
  "12.43",
  "12.42",
  "12.41",
  "12.40",
] as const;

test.describe("slice 13.10: CHANGELOG last 20 slice ids", () => {
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

  test("CHANGELOG.md lists exactly the last 20 merged slice ids", () => {
    expect(existsSync(DOC)).toBe(true);
    const text = readFileSync(DOC, "utf8");
    expect(text).toContain("13.10");
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toContain("hello@brandmybeast.com");
    expect(text).toMatch(/No lease|no lease/i);
    expect(text.toLowerCase()).not.toContain("stripe setupintent");

    for (const id of EXPECTED_SLICES) {
      expect(text).toContain(`| ${id} |`);
    }
    expect(EXPECTED_SLICES).toHaveLength(20);

    const rowIds = [...text.matchAll(/^\| (\d+\.\d+) \| #\d+ \|/gm)].map(
      (m) => m[1],
    );
    expect(rowIds).toEqual([...EXPECTED_SLICES]);
  });
});
