/**
 * Slice 12.42 — last Drizzle SQL migration name from the repo `drizzle/` folder.
 * Slice 13.44 — checked-in `drizzle/meta/_journal.json` must list every SQL tag.
 * CI and memory mode still report the on-disk migration; no Stripe / CLOSE_AT.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_FILE = /^\d{4}_.+\.sql$/;

export const DRIZZLE_JOURNAL_RELATIVE = "drizzle/meta/_journal.json";

export type DrizzleJournalEntry = {
  idx: number;
  version?: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

export type DrizzleJournal = {
  version: string;
  dialect: string;
  entries: DrizzleJournalEntry[];
};

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

export function drizzleJournalPath(rootDir: string = process.cwd()): string {
  return join(rootDir, DRIZZLE_JOURNAL_RELATIVE);
}

export function readDrizzleJournal(
  rootDir: string = process.cwd(),
): DrizzleJournal {
  const raw = readFileSync(drizzleJournalPath(rootDir), "utf8");
  return JSON.parse(raw) as DrizzleJournal;
}

/**
 * Empty array = journal matches on-disk SQL tags.
 * Non-empty = CI must fail (missing journal, drift, or laptop-only path).
 */
export function findDrizzleJournalViolations(
  rootDir: string = process.cwd(),
): string[] {
  const violations: string[] = [];
  const journalFile = drizzleJournalPath(rootDir);
  if (!existsSync(journalFile)) {
    return [`missing ${DRIZZLE_JOURNAL_RELATIVE}`];
  }
  let journal: DrizzleJournal;
  try {
    journal = readDrizzleJournal(rootDir);
  } catch (err) {
    return [
      `unreadable ${DRIZZLE_JOURNAL_RELATIVE}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    ];
  }
  if (journal.dialect !== "postgresql") {
    violations.push(`journal dialect is ${JSON.stringify(journal.dialect)}`);
  }
  if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
    violations.push("journal entries missing or empty");
    return violations;
  }
  const sqlTags = listDrizzleMigrationFiles(rootDir).map((name) =>
    name.replace(/\.sql$/i, ""),
  );
  const journalTags = journal.entries.map((e) => e.tag);
  for (const [i, entry] of journal.entries.entries()) {
    if (entry.idx !== i) {
      violations.push(`journal idx ${entry.idx} at position ${i}`);
    }
    if (!entry.tag || typeof entry.tag !== "string") {
      violations.push(`journal entry ${i} missing tag`);
    }
  }
  for (const tag of sqlTags) {
    if (!journalTags.includes(tag)) {
      violations.push(`SQL tag ${tag} missing from journal`);
    }
  }
  for (const tag of journalTags) {
    if (!sqlTags.includes(tag)) {
      violations.push(`journal tag ${tag} has no matching .sql file`);
    }
  }
  if (sqlTags.length !== journalTags.length) {
    violations.push(
      `SQL count ${sqlTags.length} != journal count ${journalTags.length}`,
    );
  }
  return violations;
}
