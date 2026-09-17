/**
 * Slice 14.44 — CI grep: fail on personal Gmail and personal handle.
 * Reuses 13.40 Gmail address scan. Handle needle is assembled so this
 * file does not contain the banned token as a contiguous literal.
 * CLOSE_AT null. Cards never charged.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  findPersonalGmailHits,
  listPersonalGmailScanTargets,
  type PersonalGmailHit,
} from "./no-personal-gmail";

/** Assembled so the source tree does not store the banned handle literally. */
export const PERSONAL_HANDLE_NEEDLE = ["@", "Nard", "Lion"].join("");

export type PersonalHandleHit = {
  file: string;
  line: number;
  match: string;
};

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "tmp",
  "test-results",
  "coverage",
  "dist",
  "playwright-report",
]);

function walkFiles(dir: string, pred: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkFiles(full, pred));
      continue;
    }
    if (pred(name)) out.push(full);
  }
  return out;
}

/** Same surface as 13.40: src/ + *.md. */
export function listPersonalHandleScanTargets(
  root: string = process.cwd(),
): string[] {
  return listPersonalGmailScanTargets(root);
}

/**
 * SLICES.md may name the banned handle only on the Wave 16 regression-doc
 * line that points back at this slice. That single documentation hit is
 * allowlisted; everywhere else fails CI.
 */
export function isAllowlistedPersonalHandleLine(
  file: string,
  line: string,
): boolean {
  const rel = file.replace(/\\/g, "/");
  if (!rel.endsWith("SLICES.md") && rel !== "SLICES.md") return false;
  return (
    line.includes("16.40") &&
    line.toLowerCase().includes("regression grep") &&
    line.includes("14.44")
  );
}

export function personalHandleMatchesInText(text: string): string[] {
  const re = new RegExp(PERSONAL_HANDLE_NEEDLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const out: string[] = [];
  for (const match of text.matchAll(re)) {
    if (match[0]) out.push(match[0]);
  }
  return out;
}

export function findPersonalHandleHits(
  root: string = process.cwd(),
): PersonalHandleHit[] {
  const hits: PersonalHandleHit[] = [];
  for (const file of listPersonalHandleScanTargets(root)) {
    const rel = relative(root, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (isAllowlistedPersonalHandleLine(rel, line)) return;
      for (const match of personalHandleMatchesInText(line)) {
        hits.push({ file: rel, line: index + 1, match });
      }
    });
  }
  return hits;
}

export type PersonalIdentityHits = {
  gmail: PersonalGmailHit[];
  handle: PersonalHandleHit[];
};

/** Combined CI grep for 14.44 — both surfaces must be empty. */
export function findPersonalIdentityHits(
  root: string = process.cwd(),
): PersonalIdentityHits {
  return {
    gmail: findPersonalGmailHits(root),
    handle: findPersonalHandleHits(root),
  };
}

/** Extra walk kept for package script callers that want tests/ too. */
export function listIdentityGrepExtraTargets(
  root: string = process.cwd(),
): string[] {
  return walkFiles(join(root, "tests"), (name) => name.endsWith(".ts"));
}
