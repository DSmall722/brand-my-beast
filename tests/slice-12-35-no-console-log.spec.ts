import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";

/**
 * Slice 12.35 — strip `console.log` from `src/` except test helpers.
 * CLOSE_AT null. No Stripe.
 */

const SRC_ROOT = join(process.cwd(), "src");

/** Paths under src/ that may keep console.log (CI / local test helpers only). */
function isTestHelperPath(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, "/").toLowerCase();
  if (norm.includes("/__tests__/")) return true;
  if (/(^|\/)test[-_.]/.test(norm)) return true;
  if (/\.test\.(ts|tsx|js|jsx)$/.test(norm)) return true;
  if (/\.spec\.(ts|tsx|js|jsx)$/.test(norm)) return true;
  return false;
}

function listSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listSourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(name)) out.push(full);
  }
  return out;
}

function findConsoleLogHits(): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  for (const file of listSourceFiles(SRC_ROOT)) {
    const rel = relative(SRC_ROOT, file);
    if (isTestHelperPath(rel)) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((text, index) => {
      if (/console\.log\s*\(/.test(text)) {
        hits.push({ file: rel, line: index + 1, text: text.trim() });
      }
    });
  }
  return hits;
}

test.describe("slice 12.35: no console.log in src (except test helpers)", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
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

  test("src/ has zero console.log outside test helpers", () => {
    const hits = findConsoleLogHits();
    expect(
      hits,
      hits.map((h) => `${h.file}:${h.line} ${h.text}`).join("\n"),
    ).toEqual([]);
  });

  test("console.error / console.info remain allowed (error + ban log)", () => {
    const errorSrc = readFileSync(
      join(process.cwd(), "src/app/error.tsx"),
      "utf8",
    );
    expect(errorSrc).toContain("console.error");
    expect(errorSrc).not.toMatch(/console\.log\s*\(/);
    const banSrc = readFileSync(
      join(process.cwd(), "src/lib/operator-ban-list.ts"),
      "utf8",
    );
    expect(banSrc).toContain("console.info");
    expect(banSrc).not.toMatch(/console\.log\s*\(/);
  });
});
