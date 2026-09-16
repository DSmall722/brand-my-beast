/**
 * Slice 12.8 — revision rows for brand / trade / amount / art changes.
 * Timestamps only. Intent ledger — never a charge receipt.
 */

import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { intentRevisions } from "./db/schema";

export type IntentRevision = {
  id: string;
  bidId: string;
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
  artworkUrl: string | null;
  createdAt: string;
};

type MemoryEnv = {
  VERCEL_ENV?: string;
  INTENT_MODE?: string;
  DATABASE_URL?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbIntentRevisions?: IntentRevision[];
};

function memoryRows(): IntentRevision[] {
  if (!globalStore.__bmbIntentRevisions) {
    globalStore.__bmbIntentRevisions = [];
  }
  return globalStore.__bmbIntentRevisions;
}

export function intentRevisionUsesMemory(
  env: MemoryEnv = process.env as MemoryEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.INTENT_MODE === "memory") return true;
  if (env.INTENT_MODE === "postgres") return false;
  return !env.DATABASE_URL;
}

export async function appendIntentRevision(input: {
  bidId: string;
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
  artworkUrl?: string | null;
}): Promise<IntentRevision> {
  if (!Number.isFinite(input.standingUsd) || !Number.isInteger(input.standingUsd)) {
    throw new Error("Revision standingUsd must be a whole dollar amount.");
  }
  const row: IntentRevision = {
    id: crypto.randomUUID(),
    bidId: input.bidId,
    brandLabel: input.brandLabel,
    tradeLabel: input.tradeLabel,
    standingUsd: input.standingUsd,
    artworkUrl: input.artworkUrl ?? null,
    createdAt: new Date().toISOString(),
  };

  if (intentRevisionUsesMemory()) {
    memoryRows().unshift(row);
    return row;
  }

  const db = getDb();
  if (!db) {
    throw new Error("Intent revisions require DATABASE_URL.");
  }
  await db.insert(intentRevisions).values({
    id: row.id,
    bidId: row.bidId,
    brandLabel: row.brandLabel,
    tradeLabel: row.tradeLabel,
    standingUsd: row.standingUsd,
    artworkUrl: row.artworkUrl,
  });
  return row;
}

export async function listIntentRevisionsForBid(
  bidId: string,
): Promise<IntentRevision[]> {
  if (intentRevisionUsesMemory()) {
    return memoryRows()
      .filter((row) => row.bidId === bidId)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(intentRevisions)
    .where(eq(intentRevisions.bidId, bidId))
    .orderBy(asc(intentRevisions.createdAt));
  return rows.map((row) => ({
    id: row.id,
    bidId: row.bidId,
    brandLabel: row.brandLabel,
    tradeLabel: row.tradeLabel,
    standingUsd: row.standingUsd,
    artworkUrl: row.artworkUrl ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listIntentRevisions(limit = 100): Promise<IntentRevision[]> {
  const capped = Math.min(Math.max(limit, 1), 500);
  if (intentRevisionUsesMemory()) {
    return memoryRows().slice(0, capped);
  }
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(intentRevisions)
    .orderBy(desc(intentRevisions.createdAt))
    .limit(capped);
  return rows.map((row) => ({
    id: row.id,
    bidId: row.bidId,
    brandLabel: row.brandLabel,
    tradeLabel: row.tradeLabel,
    standingUsd: row.standingUsd,
    artworkUrl: row.artworkUrl ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export function resetIntentRevisionsForTests(): void {
  memoryRows().length = 0;
}
