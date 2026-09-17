#!/usr/bin/env node
/**
 * Slice 14.44 — CI grep: fail on personal Gmail address or personal handle.
 * Run via `npm run grep:identity`. Exit 1 on any hit.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const PERSONAL_GMAIL_RE = /[A-Za-z0-9._%+-]+@gmail\.com/gi;
const PERSONAL_HANDLE_NEEDLE = ["@", "Nard", "Lion"].join("");
const HANDLE_RE = new RegExp(
  PERSONAL_HANDLE_NEEDLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  "gi",
);

const SKIP = new Set([
  "node_modules",
  ".git",
  ".next",
  "tmp",
  "test-results",
  "coverage",
  "dist",
  "playwright-report",
]);

function walk(dir, pred) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full, pred));
      continue;
    }
    if (pred(name)) out.push(full);
  }
  return out;
}

function targets() {
  const src = walk(join(ROOT, "src"), () => true);
  const md = walk(ROOT, (n) => n.endsWith(".md"));
  return [...new Set([...src, ...md])].sort();
}

function allowlistedHandle(file, line) {
  const rel = file.replace(/\\/g, "/");
  if (!rel.endsWith("SLICES.md")) return false;
  return (
    line.includes("16.40") &&
    line.toLowerCase().includes("regression grep") &&
    line.includes("14.44")
  );
}

const gmailHits = [];
const handleHits = [];

for (const file of targets()) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const match of line.matchAll(PERSONAL_GMAIL_RE)) {
      if (match[0]) gmailHits.push({ file: rel, line: i + 1, match: match[0] });
    }
    if (allowlistedHandle(rel, line)) return;
    for (const match of line.matchAll(HANDLE_RE)) {
      if (match[0]) handleHits.push({ file: rel, line: i + 1, match: match[0] });
    }
  });
}

if (gmailHits.length === 0 && handleHits.length === 0) {
  console.log("grep:identity ok — 0 personal Gmail, 0 personal handle.");
  process.exit(0);
}

for (const hit of gmailHits) {
  console.error(`personal-gmail ${hit.file}:${hit.line} ${hit.match}`);
}
for (const hit of handleHits) {
  console.error(`personal-handle ${hit.file}:${hit.line}`);
}
console.error(
  `grep:identity failed — ${gmailHits.length} Gmail hit(s), ${handleHits.length} handle hit(s).`,
);
process.exit(1);
