/**
 * Slice 8.8 — operator ban-list table + hard-reject matching intents.
 * Additive to the static CAMPAIGN banned-trades rules (slice 2.3).
 */

import { asc } from "drizzle-orm";
import { getDb } from "./db";
import { operatorBanList } from "./db/schema";

export type BanListRule = {
  id: string;
  pattern: string;
  note: string;
  createdAt: string;
};

type MemoryEnv = {
  VERCEL_ENV?: string;
  INTENT_MODE?: string;
  DATABASE_URL?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbOperatorBanList?: BanListRule[];
};

function memoryRules(): BanListRule[] {
  if (!globalStore.__bmbOperatorBanList) {
    globalStore.__bmbOperatorBanList = [];
  }
  return globalStore.__bmbOperatorBanList;
}

export function operatorBanListUsesMemory(
  env: MemoryEnv = process.env as MemoryEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.INTENT_MODE === "memory") return true;
  if (env.INTENT_MODE === "postgres") return false;
  return !env.DATABASE_URL;
}

function normalizePattern(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchesBanPattern(
  brandLabel: string,
  tradeLabel: string,
  pattern: string,
): boolean {
  const needle = normalizePattern(pattern);
  if (needle.length < 2) return false;
  const blob = `${brandLabel} ${tradeLabel}`.trim().toLowerCase();
  return blob.includes(needle);
}

export async function listBanRules(): Promise<BanListRule[]> {
  if (operatorBanListUsesMemory()) {
    return memoryRules()
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(operatorBanList)
    .orderBy(asc(operatorBanList.createdAt));
  return rows.map((row) => ({
    id: row.id,
    pattern: row.pattern,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function findOperatorBanMatch(input: {
  brandLabel: string;
  tradeLabel: string;
}): Promise<BanListRule | null> {
  const rules = await listBanRules();
  for (const rule of rules) {
    if (matchesBanPattern(input.brandLabel, input.tradeLabel, rule.pattern)) {
      return rule;
    }
  }
  return null;
}

export type AddBanRuleResult =
  | { ok: true; rule: BanListRule }
  | { ok: false; error: string };

export async function addBanRule(input: {
  pattern: string;
  note?: string;
}): Promise<AddBanRuleResult> {
  const pattern = normalizePattern(input.pattern);
  if (pattern.length < 2 || pattern.length > 80) {
    return { ok: false, error: "Ban pattern must be 2–80 characters." };
  }
  const note = (input.note ?? "").trim().slice(0, 280);

  const existing = await listBanRules();
  if (existing.some((rule) => rule.pattern === pattern)) {
    return { ok: false, error: "That ban pattern is already on the list." };
  }

  const rule: BanListRule = {
    id: crypto.randomUUID(),
    pattern,
    note,
    createdAt: new Date().toISOString(),
  };

  if (operatorBanListUsesMemory()) {
    memoryRules().push(rule);
    return { ok: true, rule };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Ban list requires DATABASE_URL." };
  }
  await db.insert(operatorBanList).values({
    id: rule.id,
    pattern: rule.pattern,
    note: rule.note,
  });
  return { ok: true, rule };
}

export function assertOperatorBanAllowed(input: {
  brandLabel: string;
  tradeLabel: string;
  rules: readonly BanListRule[];
  /** Where the match was checked (place / edit / sweep). */
  context?: string;
}): { ok: true } | { ok: false; error: string; rule: BanListRule } {
  for (const rule of input.rules) {
    if (matchesBanPattern(input.brandLabel, input.tradeLabel, rule.pattern)) {
      logBanListMatch({
        rule,
        brandLabel: input.brandLabel,
        tradeLabel: input.tradeLabel,
        context: input.context ?? "assert",
      });
      return {
        ok: false,
        rule,
        error: `Hard-reject: ban-list “${rule.pattern}” (rule ${rule.id}). Matching intents cannot list.`,
      };
    }
  }
  return { ok: true };
}

/** Slice 12.30 — structured ban-list match log keyed by rule id. */
export type BanListMatchLog = {
  at: string;
  ruleId: string;
  pattern: string;
  brandLabel: string;
  tradeLabel: string;
  context: string;
};

const globalBanLog = globalThis as typeof globalThis & {
  __bmbBanListMatchLogs?: BanListMatchLog[];
};

function banMatchLogs(): BanListMatchLog[] {
  if (!globalBanLog.__bmbBanListMatchLogs) {
    globalBanLog.__bmbBanListMatchLogs = [];
  }
  return globalBanLog.__bmbBanListMatchLogs;
}

export function logBanListMatch(input: {
  rule: BanListRule;
  brandLabel: string;
  tradeLabel: string;
  context: string;
}): BanListMatchLog {
  const entry: BanListMatchLog = {
    at: new Date().toISOString(),
    ruleId: input.rule.id,
    pattern: input.rule.pattern,
    brandLabel: input.brandLabel.trim(),
    tradeLabel: input.tradeLabel.trim(),
    context: input.context,
  };
  const logs = banMatchLogs();
  logs.push(entry);
  if (logs.length > 200) logs.splice(0, logs.length - 200);
  console.info("[ban-list-match]", JSON.stringify(entry));
  return entry;
}

export function listBanListMatchLogsForTests(): readonly BanListMatchLog[] {
  return banMatchLogs().slice();
}

export function resetBanListMatchLogsForTests(): void {
  banMatchLogs().length = 0;
}

export function resetOperatorBanListForTests(): void {
  memoryRules().length = 0;
  resetBanListMatchLogsForTests();
}
