import { readFileSync } from "node:fs";
import { join } from "node:path";

export type VercelGitDeploymentEnabled =
  | boolean
  | Record<string, boolean>
  | undefined;

export type VercelJsonGit = {
  git?: { deploymentEnabled?: VercelGitDeploymentEnabled };
};

export function isVercelGitHoldOrMainOnlyRestore(
  enabled: unknown,
): boolean {
  if (enabled === false) return true;
  if (!enabled || typeof enabled !== "object" || Array.isArray(enabled)) {
    return false;
  }
  const rec = enabled as Record<string, unknown>;
  return rec["*"] === false && rec.main === true;
}

export function readVercelJson(root: string = process.cwd()): VercelJsonGit {
  return JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as VercelJsonGit;
}

export function vercelJsonIsHoldOrMainOnlyRestore(
  root: string = process.cwd(),
): boolean {
  return isVercelGitHoldOrMainOnlyRestore(
    readVercelJson(root).git?.deploymentEnabled,
  );
}
