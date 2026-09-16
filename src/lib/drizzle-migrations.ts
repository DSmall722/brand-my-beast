/**
 * Slice 12.42 — last Drizzle SQL migration name from the repo `drizzle/` folder.
 * CI and memory mode still report the on-disk migration; no Stripe / CLOSE_AT.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_FILE = /^\d{4}_.+\.sql$/;

export function listDrizzleMigrationFiles(
  rootDir: string = process.cwd(),
): string[] {
  const dir = join(rootDir, "drizzle");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => MIGRATION_FILE.test(name))
    .sort();
}

/** Filename of the highest-numbered SQL migration under `drizzle/`. */
export function lastDrizzleMigrationName(
  rootDir: string = process.cwd(),
): string | null {
  const files = listDrizzleMigrationFiles(rootDir);
  return files.at(-1) ?? null;
}

/** Tag without `.sql` — what operators usually quote in runbooks. */
export function lastDrizzleMigrationTag(
  rootDir: string = process.cwd(),
): string | null {
  const name = lastDrizzleMigrationName(rootDir);
  if (!name) return null;
  return name.replace(/\.sql$/i, "");
}
