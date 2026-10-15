import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const COMPONENTS = join(ROOT, "src");

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  ".next",
  "test-results",
  "playwright-report",
  "coverage",
  "tmp",
]);

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

export function listCardComponentFiles(): string[] {
  const dir = join(ROOT, "src/components");
  return readdirSync(dir)
    .filter((name) => /Card\.tsx$/.test(name))
    .map((name) => join(dir, name))
    .sort();
}

export function findUnreferencedCardComponents(): string[] {
  const cards = listCardComponentFiles();
  const sources = listSourceFiles(COMPONENTS);
  const unused: string[] = [];

  for (const cardPath of cards) {
    const base = cardPath.split("/").pop()!.replace(/\.tsx$/, "");
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const importRe = new RegExp(
      String.raw`from\s+["'][^"']*${escaped}["']|import\s*\(\s*["'][^"']*${escaped}["']\s*\)`,
    );
    let referenced = false;
    for (const file of sources) {
      if (file === cardPath) continue;
      const src = readFileSync(file, "utf8");
      if (importRe.test(src) || src.includes(`@/components/${base}`)) {
        referenced = true;
        break;
      }
    }
    if (!referenced) {
      unused.push(relative(ROOT, cardPath));
    }
  }

  return unused;
}
