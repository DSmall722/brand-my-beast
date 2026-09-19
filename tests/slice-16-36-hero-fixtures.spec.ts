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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.36 — hero screenshots at 390 and 1280 live under tests/fixtures/board/.
 * CLOSE_AT null. No Stripe.
 */

function pngSize(path: string): { width: number; height: number } {
  const body = readFileSync(path);
  expect(body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: body.readUInt32BE(16),
    height: body.readUInt32BE(20),
  };
}

test.describe("slice 16.36: hero screenshot fixtures", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("390 and 1280 hero fixtures are stored", () => {
    const dir = join(process.cwd(), "tests/fixtures/board");
    expect(pngSize(join(dir, "hero-390.png")).width).toBe(390);
    expect(pngSize(join(dir, "hero-1280.png")).width).toBe(1280);
  });
});
