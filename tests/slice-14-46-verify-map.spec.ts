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

/**
 * Slice 14.46 — verify-brandmybeast feature map matches Wave 14.
 * Docs/skill index + merge-gate; not new product UI. CLOSE_AT null. No Stripe.
 */

const FEATURES_DIR = join(
  process.cwd(),
  ".cursor/skills/verify-brandmybeast/features",
);

const REQUIRED_MAP_FILES = [
  "README.md",
  "waves-14.md",
  "wave14-launch-readiness.md",
] as const;

/** Expand same-major condensed ranges and singles for Wave 14. */
function wave14IdsFromSlices(): string[] {
  const text = readFileSync(join(process.cwd(), "SLICES.md"), "utf8");
  const ids: string[] = [];
  for (const line of text.split("\n")) {
    const range = line.match(/^- \[[ xX]\] 14\.(\d+)[\u2013-]14\.(\d+)\b/);
    if (range) {
      const minorA = Number(range[1]);
      const minorB = Number(range[2]);
      if (minorB < minorA) continue;
      for (let m = minorA; m <= minorB; m += 1) {
        ids.push(`14.${m}`);
      }
      continue;
    }
    const single = line.match(/^- \[[ xX]\] (14\.\d+)\b/);
    if (single) ids.push(single[1]!);
  }
  return [...new Set(ids)];
}

function featureMapCorpus(): string {
  const names = readdirSync(FEATURES_DIR).filter((name) => name.endsWith(".md"));
  return names
    .map((name) => readFileSync(join(FEATURES_DIR, name), "utf8"))
    .join("\n");
}

test.describe("slice 14.46: verify-brandmybeast feature map Wave 14", () => {
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

  test("required map files exist", () => {
    for (const name of REQUIRED_MAP_FILES) {
      expect(existsSync(join(FEATURES_DIR, name))).toBe(true);
    }
  });

  test("README indexes Wave 14 and money fences", () => {
    const readme = readFileSync(join(FEATURES_DIR, "README.md"), "utf8");
    expect(readme).toContain("Wave 14");
    expect(readme).toContain("FLOOR_USD=58000");
    expect(readme).toContain("GOAL_USD=120000");
    expect(readme).toContain("CLOSE_AT=null");
    expect(readme).toContain("wave14-launch-readiness.md");
    expect(readme).toContain("waves-14.md");
    expect(readme).toContain("slice-14-46-verify-map.spec.ts");
    expect(readme).toMatch(/Never drive production|Never invent/i);
  });

  test("every Wave 14 SLICES id appears in the feature map", () => {
    const ids = wave14IdsFromSlices();
    // 14.0 … 14.50 inclusive
    expect(ids.length).toBe(51);
    expect(ids[0]).toBe("14.0");
    expect(ids).toContain("14.1");
    expect(ids).toContain("14.46");
    expect(ids.at(-1)).toBe("14.50");

    const map = featureMapCorpus();
    const index = readFileSync(join(FEATURES_DIR, "waves-14.md"), "utf8");
    expect(index).toContain("FLOOR_USD=58000");
    expect(index).toContain("GOAL_USD=120000");
    expect(index).toContain("CLOSE_AT=null");
    expect(index).toContain("14.46");

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
