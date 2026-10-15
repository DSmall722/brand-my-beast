import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function gitLastModified(relativePath: string): Date | null {
  const root = process.cwd();
  if (!existsSync(join(root, ".git"))) {
    return null;
  }
  try {
    const iso = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", relativePath],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 5_000,
      },
    ).trim();
    if (!iso) {
      return null;
    }
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function gitHeadLastModified(): Date | null {
  const root = process.cwd();
  if (!existsSync(join(root, ".git"))) {
    return null;
  }
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
    }).trim();
    if (!iso) {
      return null;
    }
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
