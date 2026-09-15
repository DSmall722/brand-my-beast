/**
 * Slice 8.9 — audit log rows on approve / reject (who, when, note id).
 */

import { desc } from "drizzle-orm";
import { getDb } from "./db";
import { operatorAuditLog } from "./db/schema";

export type AuditDecision = "approved" | "rejected";

export type AuditLogRow = {
  id: string;
  bidId: string;
  decision: AuditDecision;
  actorEmail: string;
  actorUserId: string | null;
  noteId: string | null;
  createdAt: string;
};

type MemoryEnv = {
  VERCEL_ENV?: string;
  INTENT_MODE?: string;
  DATABASE_URL?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbOperatorAuditLog?: AuditLogRow[];
};

function memoryRows(): AuditLogRow[] {
  if (!globalStore.__bmbOperatorAuditLog) {
    globalStore.__bmbOperatorAuditLog = [];
  }
  return globalStore.__bmbOperatorAuditLog;
}

export function operatorAuditLogUsesMemory(
  env: MemoryEnv = process.env as MemoryEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.INTENT_MODE === "memory") return true;
  if (env.INTENT_MODE === "postgres") return false;
  return !env.DATABASE_URL;
}

export async function appendOperatorAuditLog(input: {
  bidId: string;
  decision: AuditDecision;
  actorEmail: string;
  actorUserId?: string | null;
  noteId?: string | null;
}): Promise<AuditLogRow> {
  const email = input.actorEmail.trim().toLowerCase();
  if (!email) {
    throw new Error("Audit log requires actor email.");
  }
  const row: AuditLogRow = {
    id: crypto.randomUUID(),
    bidId: input.bidId,
    decision: input.decision,
    actorEmail: email,
    actorUserId: input.actorUserId ?? null,
    noteId: input.noteId ?? null,
    createdAt: new Date().toISOString(),
  };

  if (operatorAuditLogUsesMemory()) {
    memoryRows().unshift(row);
    return row;
  }

  const db = getDb();
  if (!db) {
    throw new Error("Audit log requires DATABASE_URL.");
  }
  await db.insert(operatorAuditLog).values({
    id: row.id,
    bidId: row.bidId,
    decision: row.decision,
    actorEmail: row.actorEmail,
    actorUserId: row.actorUserId,
    noteId: row.noteId,
  });
  return row;
}

export async function listOperatorAuditLog(limit = 100): Promise<AuditLogRow[]> {
  const capped = Math.min(Math.max(limit, 1), 500);
  if (operatorAuditLogUsesMemory()) {
    return memoryRows().slice(0, capped);
  }
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(operatorAuditLog)
    .orderBy(desc(operatorAuditLog.createdAt))
    .limit(capped);
  return rows.map((row) => ({
    id: row.id,
    bidId: row.bidId,
    decision: row.decision as AuditDecision,
    actorEmail: row.actorEmail,
    actorUserId: row.actorUserId ?? null,
    noteId: row.noteId ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export function resetOperatorAuditLogForTests(): void {
  memoryRows().length = 0;
}
