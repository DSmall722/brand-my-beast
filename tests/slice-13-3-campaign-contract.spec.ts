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
 * Slice 13.3 — CAMPAIGN.md links CONTRACT.md for wreck text.
 * Money table stays $58,000 / $120,000. CLOSE_AT null. No Stripe.
 */
const CAMPAIGN = join(process.cwd(), "CAMPAIGN.md");
const CONTRACT = join(process.cwd(), "CONTRACT.md");

test.describe("slice 13.3: CAMPAIGN.md links CONTRACT.md for wreck", () => {
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

  test("CAMPAIGN money table intact and points at CONTRACT wreck section", () => {
    expect(existsSync(CAMPAIGN)).toBe(true);
    expect(existsSync(CONTRACT)).toBe(true);
    const campaign = readFileSync(CAMPAIGN, "utf8");
    const contract = readFileSync(CONTRACT, "utf8");

    expect(campaign).toContain("$58,000");
    expect(campaign).toContain("$120,000");
    expect(campaign).toMatch(/CONTRACT\.md/);
    expect(campaign).toMatch(/13\.3|Wreck and refund/i);
    expect(campaign.toLowerCase()).not.toContain("gmail.com");

    expect(contract).toMatch(/## Wreck and refund/i);
    expect(contract).toContain("$58,000");
    expect(contract).toContain("$120,000");
  });
});
