import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { CLOSE_AT, FLOOR_USD, GOAL_USD } from "../src/lib/campaign";

/**
 * Slice 11.3 — verify-brandmybeast feature map matches Waves 7–10.
 * Docs/skill index + merge-gate; not new product UI.
 */
const FEATURES_DIR = join(
  process.cwd(),
  ".cursor/skills/verify-brandmybeast/features",
);

const REQUIRED_MAP_FILES = [
  "README.md",
  "waves-7-10.md",
  "wave7-hygiene.md",
  "wave8-operator-day.md",
  "wave9-auction-mechanics.md",
  "wave10-compositor.md",
] as const;

function wave710IdsFromSlices(): string[] {
  const text = readFileSync(join(process.cwd(), "SLICES.md"), "utf8");
  const ids: string[] = [];
  for (const line of text.split("\n")) {
    // Condensed: `- [x] 7.1–7.10 Complete.` or `- [x] 8.1-8.10 Complete.`
    const range = line.match(
      /^- \[[ xX]\] (7|8|9|10)\.(\d+)[\u2013-](7|8|9|10)\.(\d+)\b/,
    );
    if (range) {
      const majorA = Number(range[1]);
      const minorA = Number(range[2]);
      const majorB = Number(range[3]);
      const minorB = Number(range[4]);
      if (majorA !== majorB || minorB < minorA) continue;
      for (let m = minorA; m <= minorB; m += 1) {
        ids.push(`${majorA}.${m}`);
      }
      continue;
    }
    const single = line.match(/^- \[[ xX]\] ((?:7|8|9|10)\.\d+)\b/);
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

test.describe("slice 11.3: verify-brandmybeast feature map Waves 7–10", () => {
  test("campaign constants stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
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

  test("README indexes Waves 7–10 and money fences", () => {
    const readme = readFileSync(join(FEATURES_DIR, "README.md"), "utf8");
    expect(readme).toContain("Waves 7–10");
    expect(readme).toContain("FLOOR_USD=58000");
    expect(readme).toContain("GOAL_USD=120000");
    expect(readme).toContain("CLOSE_AT=null");
    expect(readme).toContain("wave7-hygiene.md");
    expect(readme).toContain("wave8-operator-day.md");
    expect(readme).toContain("wave9-auction-mechanics.md");
    expect(readme).toContain("wave10-compositor.md");
    expect(readme).toContain("slice-11-3-verify-map.spec.ts");
    expect(readme).toMatch(/Never drive production|Never invent/i);
  });

  test("every Wave 7–10 SLICES id appears in the feature map", () => {
    const ids = wave710IdsFromSlices();
    expect(ids.length).toBe(40);
    expect(ids[0]).toBe("7.1");
    expect(ids.at(-1)).toBe("10.10");

    const map = featureMapCorpus();
    const index = readFileSync(join(FEATURES_DIR, "waves-7-10.md"), "utf8");
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
