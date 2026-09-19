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

/**
 * Slice 16.41 — verify-brandmybeast feature map matches Wave 16.
 * Docs/skill index + merge-gate; not new product UI. CLOSE_AT null. No Stripe.
 * Does not flip SEATS_OPEN. Does not start Wave 15.
 */

const FEATURES_DIR = join(
  process.cwd(),
  ".cursor/skills/verify-brandmybeast/features",
);

const REQUIRED_MAP_FILES = [
  "README.md",
  "waves-16.md",
  "wave16-numbered-board.md",
] as const;

/** Expand same-major condensed ranges and singles for Wave 16, including 16.0a–g. */
function wave16IdsFromSlices(): string[] {
  const text = readFileSync(join(process.cwd(), "SLICES.md"), "utf8");
  const ids: string[] = [];
  for (const line of text.split("\n")) {
    const range = line.match(/^- \[[ xX]\] 16\.(\d+)[\u2013-]16\.(\d+)\b/);
    if (range) {
      const minorA = Number(range[1]);
      const minorB = Number(range[2]);
      if (minorB < minorA) continue;
      for (let m = minorA; m <= minorB; m += 1) {
        ids.push(`16.${m}`);
      }
      continue;
    }
    const letter = line.match(/^- \[[ xX]\] (16\.0[a-g])\b/);
    if (letter) {
      ids.push(letter[1]!);
      continue;
    }
    const single = line.match(/^- \[[ xX]\] (16\.\d+)\b/);
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

test.describe("slice 16.41: verify-brandmybeast feature map Wave 16", () => {
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

  test("required map files exist", () => {
    for (const name of REQUIRED_MAP_FILES) {
      expect(existsSync(join(FEATURES_DIR, name))).toBe(true);
    }
  });

  test("README indexes Wave 16 and money fences", () => {
    const readme = readFileSync(join(FEATURES_DIR, "README.md"), "utf8");
    expect(readme).toContain("Wave 16");
    expect(readme).toContain("FLOOR_USD=58000");
    expect(readme).toContain("GOAL_USD=120000");
    expect(readme).toContain("CLOSE_AT=null");
    expect(readme).toContain("wave16-numbered-board.md");
    expect(readme).toContain("waves-16.md");
    expect(readme).toContain("slice-16-41-verify-map.spec.ts");
    expect(readme).toMatch(/Never drive production|Never invent/i);
  });

  test("every Wave 16 SLICES id appears in the feature map", () => {
    const ids = wave16IdsFromSlices();
    // 16.0a–g plus 16.1 … 16.50
    expect(ids.length).toBe(57);
    expect(ids).toContain("16.0a");
    expect(ids).toContain("16.0g");
    expect(ids).toContain("16.1");
    expect(ids).toContain("16.4");
    expect(ids).toContain("16.5");
    expect(ids).toContain("16.28");
    expect(ids).toContain("16.41");
    expect(ids.at(-1)).toBe("16.50");

    const map = featureMapCorpus();
    const index = readFileSync(join(FEATURES_DIR, "waves-16.md"), "utf8");
    expect(index).toContain("FLOOR_USD=58000");
    expect(index).toContain("GOAL_USD=120000");
    expect(index).toContain("CLOSE_AT=null");
    expect(index).toContain("16.41");

    const missingFromIndex: string[] = [];
    const missingFromCorpus: string[] = [];
    for (const id of ids) {
      const needle = new RegExp(`\\b${id.replace(".", "\\.")}\\b`);
      if (!needle.test(index)) missingFromIndex.push(id);
      if (!needle.test(map)) missingFromCorpus.push(id);
    }
    expect(missingFromIndex).toEqual([]);
    expect(missingFromCorpus).toEqual([]);
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
