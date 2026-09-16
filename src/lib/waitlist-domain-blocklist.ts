/**
 * Slice 13.31 — waitlist disposable-domain blocklist (operator editable).
 * Additive built-in disposables + operator-added domains. Exact domain match.
 */

import { asc } from "drizzle-orm";
import { getDb } from "./db";
import { waitlistDomainBlocklist } from "./db/schema";

export type DomainBlockRule = {
  id: string;
  domain: string;
  note: string;
  createdAt: string;
  source: "default" | "operator";
};

/** Built-in disposable / throwaway domains. Always blocked. */
export const DEFAULT_DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "yopmail.com",
  "trashmail.com",
  "throwaway.email",
] as const;

type MemoryEnv = {
  VERCEL_ENV?: string;
  INTENT_MODE?: string;
  DATABASE_URL?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbWaitlistDomainBlocklist?: DomainBlockRule[];
  __bmbWaitlistDomainDefaultsSeeded?: boolean;
};

function memoryRules(): DomainBlockRule[] {
  if (!globalStore.__bmbWaitlistDomainBlocklist) {
    globalStore.__bmbWaitlistDomainBlocklist = [];
  }
  return globalStore.__bmbWaitlistDomainBlocklist;
}

export function waitlistDomainBlocklistUsesMemory(
  env: MemoryEnv = process.env as MemoryEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.INTENT_MODE === "memory") return true;
  if (env.INTENT_MODE === "postgres") return false;
  return !env.DATABASE_URL;
}

export function normalizeEmailDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 0) return "";
  return trimmed.slice(at + 1).replace(/^\.+|\.+$/g, "");
}

export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/^\.+|\.+$/g, "");
}

function domainLooksValid(domain: string): boolean {
  if (domain.length < 3 || domain.length > 253) return false;
  if (!domain.includes(".")) return false;
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
    domain,
  );
}

function defaultRules(): DomainBlockRule[] {
  const at = "1970-01-01T00:00:00.000Z";
  return DEFAULT_DISPOSABLE_DOMAINS.map((domain, index) => ({
    id: `default-disposable-${index + 1}`,
    domain,
    note: "Built-in disposable domain",
    createdAt: at,
    source: "default" as const,
  }));
}

function seedMemoryDefaults(): void {
  if (globalStore.__bmbWaitlistDomainDefaultsSeeded) return;
  const rules = memoryRules();
  for (const rule of defaultRules()) {
    if (!rules.some((row) => row.domain === rule.domain)) {
      rules.push(rule);
    }
  }
  globalStore.__bmbWaitlistDomainDefaultsSeeded = true;
}

export async function listDomainBlocks(): Promise<DomainBlockRule[]> {
  if (waitlistDomainBlocklistUsesMemory()) {
    seedMemoryDefaults();
    return memoryRules()
      .slice()
      .sort((a, b) => a.domain.localeCompare(b.domain));
  }

  const db = getDb();
  if (!db) return defaultRules();
  const rows = await db
    .select()
    .from(waitlistDomainBlocklist)
    .orderBy(asc(waitlistDomainBlocklist.domain));
  const operatorRows: DomainBlockRule[] = rows.map((row) => ({
    id: row.id,
    domain: row.domain,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    source: "operator",
  }));
  const merged = [...defaultRules()];
  for (const row of operatorRows) {
    if (!merged.some((rule) => rule.domain === row.domain)) {
      merged.push(row);
    }
  }
  return merged.sort((a, b) => a.domain.localeCompare(b.domain));
}

export async function findWaitlistDomainBlock(
  email: string,
): Promise<DomainBlockRule | null> {
  const domain = normalizeEmailDomain(email);
  if (!domain) return null;
  const rules = await listDomainBlocks();
  return rules.find((rule) => rule.domain === domain) ?? null;
}

export type AddDomainBlockResult =
  | { ok: true; rule: DomainBlockRule }
  | { ok: false; error: string };

export async function addDomainBlock(input: {
  domain: string;
  note?: string;
}): Promise<AddDomainBlockResult> {
  const domain = normalizeDomain(input.domain);
  if (!domainLooksValid(domain)) {
    return {
      ok: false,
      error: "Domain must look like example.com (3–253 characters).",
    };
  }
  const note = (input.note ?? "").trim().slice(0, 280);

  const existing = await listDomainBlocks();
  if (existing.some((rule) => rule.domain === domain)) {
    return { ok: false, error: "That domain is already on the blocklist." };
  }

  const rule: DomainBlockRule = {
    id: crypto.randomUUID(),
    domain,
    note,
    createdAt: new Date().toISOString(),
    source: "operator",
  };

  if (waitlistDomainBlocklistUsesMemory()) {
    seedMemoryDefaults();
    memoryRules().push(rule);
    return { ok: true, rule };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Domain blocklist requires DATABASE_URL." };
  }
  await db.insert(waitlistDomainBlocklist).values({
    id: rule.id,
    domain: rule.domain,
    note: rule.note,
  });
  return { ok: true, rule };
}

export function resetWaitlistDomainBlocklistForTests(): void {
  memoryRules().length = 0;
  globalStore.__bmbWaitlistDomainDefaultsSeeded = false;
}
