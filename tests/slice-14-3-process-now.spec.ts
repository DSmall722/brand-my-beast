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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";

/**
 * Slice 14.3 — PROCESS.md: Now = first unchecked SLICES box;
 * live URL is not a gate. CLOSE_AT null. No Stripe. No clock.
 */

const PROCESS = join(process.cwd(), "PROCESS.md");
const SLICES = join(process.cwd(), "SLICES.md");

test.describe("slice 14.3: PROCESS Now + live URL not a gate", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("PROCESS.md defines Now and rejects live URL as merge gate", () => {
    expect(existsSync(PROCESS)).toBe(true);
    expect(existsSync(SLICES)).toBe(true);
    const text = readFileSync(PROCESS, "utf8");
    expect(text).toContain("14.3");
    expect(text).toContain("SLICES.md");
    expect(text).toMatch(/Now.*=.*first unchecked/i);
    expect(text).toMatch(/Live URL is not a gate/i);
    expect(text).toMatch(/live site is not a gate/i);
    expect(text).toMatch(/VERCEL-HOLD|Vercel usage hold/i);
    expect(text).toMatch(/Playwright/);
    expect(text).toMatch(/not wired/i);
    expect(text).toMatch(/Do not start the 30-day clock/i);
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text.toLowerCase()).not.toContain("gmail.com");

    const slices = readFileSync(SLICES, "utf8");
    expect(slices).toMatch(/\*\*Now:\*\*/);
    expect(slices).toMatch(/first unchecked|only build order/i);
  });
});
