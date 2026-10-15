import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const PERSONAL_GMAIL_RE = /[A-Za-z0-9._%+-]+@gmail\.com/gi;

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

export type PersonalGmailHit = {
  file: string;
  line: number;
  match: string;
};

export function personalGmailMatchesInText(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(PERSONAL_GMAIL_RE)) {
    if (match[0]) out.push(match[0]);
  }
  return out;
}

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

export function listPersonalGmailScanTargets(
  root: string = process.cwd(),
): string[] {
  const srcFiles = walkFiles(join(root, "src"), () => true);
  const mdFiles = walkFiles(root, (name) => name.endsWith(".md"));
  return [...new Set([...srcFiles, ...mdFiles])].sort();
}

export function findPersonalGmailHits(
  root: string = process.cwd(),
): PersonalGmailHit[] {
  const hits: PersonalGmailHit[] = [];
  for (const file of listPersonalGmailScanTargets(root)) {
    const rel = relative(root, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const match of personalGmailMatchesInText(line)) {
        hits.push({ file: rel, line: index + 1, match });
      }
    });
  }
  return hits;
}
