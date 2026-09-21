import { existsSync, readdirSync, readFileSync } from "node:fs";
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
import { slicesIdsForMajors } from "./helpers/slices-ids";

/**
 * Slice 13.47 — verify-brandmybeast feature map matches Waves 9–13.
 * Docs/skill index + merge-gate; not new product UI. CLOSE_AT null. No Stripe.
 */

const FEATURES_DIR = join(
  process.cwd(),
  ".cursor/skills/verify-brandmybeast/features",
);

const REQUIRED_MAP_FILES = [
  "README.md",
  "waves-9-13.md",
  "wave9-auction-mechanics.md",
  "wave10-compositor.md",
  "wave11-hardening.md",
  "wave12-money-ready.md",
  "wave13-docs-freeze.md",
] as const;

/** Expand condensed `0.1–18.7` (and same-major leftovers) for Waves 9–13. */
function wave913IdsFromSlices(): string[] {
  return slicesIdsForMajors([9, 10, 11, 12, 13]);
}

function featureMapCorpus(): string {
  const names = readdirSync(FEATURES_DIR).filter((name) => name.endsWith(".md"));
  return names
    .map((name) => readFileSync(join(FEATURES_DIR, name), "utf8"))
    .join("\n");
}

test.describe("slice 13.47: verify-brandmybeast feature map Waves 9–13", () => {
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
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("required map files exist", () => {
    for (const name of REQUIRED_MAP_FILES) {
      expect(existsSync(join(FEATURES_DIR, name))).toBe(true);
    }
  });

  test("README indexes Waves 9–13 and money fences", () => {
    const readme = readFileSync(join(FEATURES_DIR, "README.md"), "utf8");
    expect(readme).toContain("Waves 9–13");
    expect(readme).toContain("FLOOR_USD=58000");
    expect(readme).toContain("GOAL_USD=120000");
    expect(readme).toContain("CLOSE_AT=null");
    expect(readme).toContain("wave11-hardening.md");
    expect(readme).toContain("wave13-docs-freeze.md");
    expect(readme).toContain("waves-9-13.md");
    expect(readme).toContain("slice-13-47-verify-map.spec.ts");
    expect(readme).toMatch(/Never drive production|Never invent/i);
  });

  test("every Wave 9–13 SLICES id appears in the feature map", () => {
    const ids = wave913IdsFromSlices();
    // 9.1–9.10 + 10.1–10.10 + 11.1–11.10 + 12.1–11.50 + 13.1–13.50 = 130
    // SLICES may still show condensed 13.1–13.44 plus later singles.
    expect(ids.length).toBeGreaterThanOrEqual(100);
    expect(ids[0]).toBe("9.1");
    expect(ids).toContain("10.10");
    expect(ids).toContain("11.1");
    expect(ids).toContain("12.1");
    expect(ids).toContain("12.50");
    expect(ids).toContain("13.1");
    expect(ids).toContain("13.47");

    const map = featureMapCorpus();
    const index = readFileSync(join(FEATURES_DIR, "waves-9-13.md"), "utf8");
    expect(index).toContain("FLOOR_USD=58000");
    expect(index).toContain("GOAL_USD=120000");
    expect(index).toContain("CLOSE_AT=null");
    expect(index).toContain("13.47");

    const missingFromIndex: string[] = [];
    const missingFromCorpus: string[] = [];
    for (const id of ids) {
      if (!new RegExp(`\\b${id.replace(".", "\\.")}\\b`).test(index)) {
        missingFromIndex.push(id);
      }
      if (!new RegExp(`\\b${id.replace(".", "\\.")}\\b`).test(map)) {
        missingFromCorpus.push(id);
      }
    }
    expect(missingFromIndex).toEqual([]);
    expect(missingFromCorpus).toEqual([]);
  });
});
