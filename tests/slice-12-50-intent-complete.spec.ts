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
 * Slice 12.50 — Pre-P3 freeze tag `intent-complete`.
 * Does not set CLOSE_AT. Does not add Stripe.
 */
const FREEZE = join(process.cwd(), "docs/INTENT-COMPLETE.md");
const CAMPAIGN_TS = join(process.cwd(), "src/lib/campaign.ts");

test.describe("slice 12.50: intent-complete freeze (no CLOSE_AT / Stripe)", () => {
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

  test("freeze doc names intent-complete and forbids CLOSE_AT / Stripe", () => {
    expect(existsSync(FREEZE)).toBe(true);
    const text = readFileSync(FREEZE, "utf8");
    expect(text).toContain("12.50");
    expect(text).toContain("intent-complete");
    expect(text).toMatch(/\$58,000|FLOOR_USD/);
    expect(text).toMatch(/\$120,000|GOAL_USD/);
    expect(text).toMatch(/CLOSE_AT.*null|remains \*\*null\*\*/i);
    expect(text).toMatch(/Does \*\*not\*\* start the 30-day clock|does not set CLOSE_AT/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).toMatch(/No lease|no lease/i);
    expect(text.toLowerCase()).not.toContain("stripe setupintent");

    const campaign = readFileSync(CAMPAIGN_TS, "utf8");
    expect(campaign).toMatch(/CLOSE_AT\s*=\s*null/);
    expect(campaign).not.toMatch(/from ["']stripe["']/);
  });
});
