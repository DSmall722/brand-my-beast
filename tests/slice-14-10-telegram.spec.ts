import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
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
 * Slice 14.10 — Kill leftover telegram lines in `.md` except a history note.
 * CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const ROOT = process.cwd();
const STALE = join(ROOT, "STALE.md");
const SLICES = join(ROOT, "SLICES.md");

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  ".next",
  "test-results",
  "playwright-report",
  "coverage",
  "tmp",
]);

function listMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listMarkdownFiles(full));
    } else if (name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

test.describe("slice 14.10: no telegram in .md except history", () => {
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

  test("STALE history note exists; other .md files have no telegram", () => {
    const stale = readFileSync(STALE, "utf8");
    expect(stale).toContain("14.10");
    expect(stale).toMatch(/Telegram bot \/ channel as campaign ops/i);
    expect(stale).toMatch(/History note only/i);
    expect(stale).toContain("@BrandMyBeast");
    expect(stale).toContain("hello@brandmybeast.com");

    const offenders: string[] = [];
    for (const file of listMarkdownFiles(ROOT)) {
      const rel = relative(ROOT, file);
      const text = readFileSync(file, "utf8");
      if (!/telegram/i.test(text)) continue;

      if (file === STALE) {
        // History note only — already asserted above.
        continue;
      }
      if (file === SLICES) {
        const bad = text
          .split("\n")
          .filter((line) => /telegram/i.test(line))
          .filter((line) => !/14\.10/.test(line));
        if (bad.length > 0) {
          offenders.push(`${rel}: ${bad.join(" | ")}`);
        }
        continue;
      }
      offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
