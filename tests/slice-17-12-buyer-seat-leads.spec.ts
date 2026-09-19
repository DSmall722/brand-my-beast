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
import { dirtyCleanPairCopyIsSafe, DIRTY_CLEAN_PAIR_LEAD } from "../src/lib/dirty-clean-pair";
import {
  FINISH_CONDITIONS_LEAD,
  finishConditionsCopyIsSafe,
} from "../src/lib/finish-conditions";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import {
  STAINLESS_COMPOSITOR_LEAD,
  stainlessCompositorCopyIsSafe,
} from "../src/lib/stainless-compositor";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 17.12 — seat leads are buyer sentences.
 * No compositor / shader / VIN / “Dirty vs clean pair” in those leads.
 * Floor and buyout come from formatUsd. CLOSE_AT null. No Stripe.
 */

const BANNED = [/compositor/i, /shader/i, /\bvin\b/i, /dirty vs clean pair/i];

function buyerLead(lead: string) {
  expect(lead).toContain(formatUsd(FLOOR_USD));
  expect(lead).toContain(formatUsd(GOAL_USD));
  for (const pattern of BANNED) {
    expect(lead).not.toMatch(pattern);
  }
  expect(lead.toLowerCase()).not.toMatch(/\blease\b/);
  expect(lead).not.toContain("CLOSE_AT");
}

test.describe("slice 17.12: buyer seat leads", () => {
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("the three leads are buyer sentences and the guards dropped jargon", () => {
    buyerLead(STAINLESS_COMPOSITOR_LEAD);
    buyerLead(FINISH_CONDITIONS_LEAD);
    buyerLead(DIRTY_CLEAN_PAIR_LEAD);
    expect(stainlessCompositorCopyIsSafe()).toBe(true);
    expect(finishConditionsCopyIsSafe()).toBe(true);
    expect(dirtyCleanPairCopyIsSafe()).toBe(true);
    expect(
      stainlessCompositorCopyIsSafe(
        `Preview only. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. shader`,
      ),
    ).toBe(false);
    expect(
      stainlessCompositorCopyIsSafe(
        `Preview only. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}.`,
      ),
    ).toBe(true);
    for (const file of [
      "src/lib/stainless-compositor.ts",
      "src/lib/finish-conditions.ts",
      "src/lib/dirty-clean-pair.ts",
    ]) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src).toContain("formatUsd(FLOOR_USD)");
      expect(src).toContain("formatUsd(GOAL_USD)");
    }
  });
});
