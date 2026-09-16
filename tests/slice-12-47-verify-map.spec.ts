import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";

/**
 * Slice 12.47 — verify-brandmybeast feature map matches Wave 12.
 * Docs/skill index + merge-gate; not new product UI. CLOSE_AT null. No Stripe.
 */
const FEATURES_DIR = join(
  process.cwd(),
  ".cursor/skills/verify-brandmybeast/features",
);

const REQUIRED_MAP_FILES = [
  "README.md",
  "waves-12.md",
  "wave12-money-ready.md",
] as const;

function wave12IdsFromSlices(): string[] {
  const text = readFileSync(join(process.cwd(), "SLICES.md"), "utf8");
  const ids: string[] = [];
  for (const line of text.split("\n")) {
    const range = line.match(
      /^- \[[ xX]\] 12\.(\d+)[\u2013-]12\.(\d+)\b/,
    );
    if (range) {
      const minorA = Number(range[1]);
      const minorB = Number(range[2]);
      if (minorB < minorA) continue;
      for (let m = minorA; m <= minorB; m += 1) {
        ids.push(`12.${m}`);
      }
      continue;
    }
    const single = line.match(/^- \[[ xX]\] (12\.\d+)\b/);
    if (single) ids.push(single[1]!);
  }
  return ids;
}

function featureMapCorpus(): string {
  const names = readdirSync(FEATURES_DIR).filter((name) => name.endsWith(".md"));
  return names
    .map((name) => readFileSync(join(FEATURES_DIR, name), "utf8"))
    .join("\n");
}

test.describe("slice 12.47: verify-brandmybeast feature map Wave 12", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
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

  test("required map files exist", () => {
    for (const name of REQUIRED_MAP_FILES) {
      expect(existsSync(join(FEATURES_DIR, name))).toBe(true);
    }
  });

  test("README indexes Wave 12 and money fences", () => {
    const readme = readFileSync(join(FEATURES_DIR, "README.md"), "utf8");
    expect(readme).toContain("Wave 12");
    expect(readme).toContain("FLOOR_USD=58000");
    expect(readme).toContain("GOAL_USD=120000");
    expect(readme).toContain("CLOSE_AT=null");
    expect(readme).toContain("wave12-money-ready.md");
    expect(readme).toContain("waves-12.md");
    expect(readme).toContain("slice-12-47-verify-map.spec.ts");
    expect(readme).toMatch(/Never drive production|Never invent/i);
  });

  test("every Wave 12 SLICES id appears in the feature map", () => {
    const ids = wave12IdsFromSlices();
    expect(ids.length).toBe(50);
    expect(ids[0]).toBe("12.1");
    expect(ids.at(-1)).toBe("12.50");

    const map = featureMapCorpus();
    const index = readFileSync(join(FEATURES_DIR, "waves-12.md"), "utf8");
    expect(index).toContain("FLOOR_USD=58000");
    expect(index).toContain("GOAL_USD=120000");
    expect(index).toContain("CLOSE_AT=null");

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
