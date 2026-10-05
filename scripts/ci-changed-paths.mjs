#!/usr/bin/env node
/**
 * Decide whether a push needs the full Playwright suite.
 *
 * Docs-only diffs skip the browser suite. The dev server and Chromium are
 * the minutes. CONTRACT.md stays on the full suite because the counsel ZIP
 * reads it at runtime.
 *
 * Writes `mode=full` or `mode=docs` to GITHUB_OUTPUT when that env is set.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

export function isDocsOnlyPath(file) {
  if (file === "CONTRACT.md") return false;
  if (file.startsWith("docs/")) return true;
  if (file.startsWith("press-kit/")) return true;
  if (file.startsWith(".cursor/")) return true;
  if (file.endsWith(".md")) return true;
  return false;
}

export function suiteMode(files) {
  if (files.length === 0) return "full";
  return files.every(isDocsOnlyPath) ? "docs" : "full";
}

function changedFiles() {
  const event = process.env.GITHUB_EVENT_NAME ?? "";
  let base = "";
  if (event === "pull_request") {
    base = process.env.PR_BASE_SHA ?? "";
  } else if (event === "push") {
    base = process.env.BEFORE_SHA ?? "";
    if (!base || /^0+$/.test(base)) return null;
  } else {
    return null;
  }
  if (!base) return null;
  try {
    execFileSync("git", ["fetch", "--no-tags", "--depth=1", "origin", base], {
      stdio: "inherit",
    });
  } catch {
    return null;
  }
  const diff = execFileSync("git", ["diff", "--name-only", base, "HEAD"], {
    encoding: "utf8",
  });
  return diff
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function emit(mode) {
  console.log(`ci suite mode: ${mode}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `mode=${mode}\n`);
  }
}

function selfCheck() {
  const cases = [
    [["SLICES.md"], "docs"],
    [["docs/PLAYWRIGHT-OFFLINE.md"], "docs"],
    [["press-kit/FACT-SHEET.md"], "docs"],
    [[".cursor/skills/verify-brandmybeast/SKILL.md"], "docs"],
    [["CAMPAIGN.md", "RULES.md"], "docs"],
    [["CONTRACT.md"], "full"],
    [["src/lib/campaign.ts"], "full"],
    [["tests/stripe-deposit.spec.ts"], "full"],
    [["docs/STATUS.md", "src/app/page.tsx"], "full"],
    [[], "full"],
  ];
  for (const [files, expected] of cases) {
    const got = suiteMode(files);
    if (got !== expected) {
      console.error(`self-check failed for ${files.join(",")} → ${got}, expected ${expected}`);
      process.exit(1);
    }
  }
  console.log("ci-changed-paths self-check ok");
}

if (process.argv[2] === "--self-check") {
  selfCheck();
} else if (process.env.GITHUB_EVENT_NAME) {
  const files = changedFiles();
  emit(files === null ? "full" : suiteMode(files));
} else if (process.argv.length > 2) {
  emit(suiteMode(process.argv.slice(2)));
} else {
  emit("full");
}
