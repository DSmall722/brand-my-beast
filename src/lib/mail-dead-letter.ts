/**
 * Slice 12.12 — dead-letter queue for failed Resend sends.
 * Operator can retry. Intent / notify only — never a charge receipt.
 */

import { and, desc, eq } from "drizzle-orm";
import { Resend } from "resend";
import { getDb } from "./db";
import { mailDeadLetters } from "./db/schema";

export type MailDeadLetterKind =
  | "intent-status"
  | "waitlist"
  | "operator-digest";

export type MailDeadLetterStatus = "pending" | "sent";

export type MailDeadLetter = {
  id: string;
  kind: MailDeadLetterKind;
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText: string;
  error: string;
  status: MailDeadLetterStatus;
  createdAt: string;
  retriedAt: string | null;
};

export type MailDeadLetterPayload = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export type MailDeadLetterMailer = {
  send: (payload: MailDeadLetterPayload) => Promise<unknown>;
};

type MemoryEnv = {
  VERCEL_ENV?: string;
  INTENT_MODE?: string;
  DATABASE_URL?: string;
};

const KINDS: readonly MailDeadLetterKind[] = [
  "intent-status",
  "waitlist",
  "operator-digest",
] as const;

const globalStore = globalThis as typeof globalThis & {
  __bmbMailDeadLetters?: MailDeadLetter[];
  __bmbMailDeadLetterMailer?: MailDeadLetterMailer | null;
};

function memoryRows(): MailDeadLetter[] {
  if (!globalStore.__bmbMailDeadLetters) {
    globalStore.__bmbMailDeadLetters = [];
  }
  return globalStore.__bmbMailDeadLetters;
}

export function mailDeadLetterUsesMemory(
  env: MemoryEnv = process.env as MemoryEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.INTENT_MODE === "memory") return true;
  if (env.INTENT_MODE === "postgres") return false;
  return !env.DATABASE_URL;
}

export function setMailDeadLetterMailerForTests(
  mailer: MailDeadLetterMailer | null,
): void {
  globalStore.__bmbMailDeadLetterMailer = mailer;
}

export function resetMailDeadLettersForTests(): void {
  memoryRows().length = 0;
  globalStore.__bmbMailDeadLetterMailer = null;
}

function resolveRetryMailer(
  apiKey: string | undefined,
): MailDeadLetterMailer | null {
  if (globalStore.__bmbMailDeadLetterMailer) {
    return globalStore.__bmbMailDeadLetterMailer;
  }
  if (!apiKey) return null;
  const resend = new Resend(apiKey);
  return {
    send: (payload) => resend.emails.send(payload),
  };
}

function parseKind(raw: string): MailDeadLetterKind {
  if ((KINDS as readonly string[]).includes(raw)) {
    return raw as MailDeadLetterKind;
  }
  throw new Error(`Unknown mail dead-letter kind: ${raw}`);
}

function parseStatus(raw: string): MailDeadLetterStatus {
  if (raw === "pending" || raw === "sent") return raw;
  throw new Error(`Unknown mail dead-letter status: ${raw}`);
}

export async function appendMailDeadLetter(input: {
  kind: MailDeadLetterKind;
  from: string;
  to: string;
  subject: string;
  text: string;
  error: unknown;
}): Promise<MailDeadLetter> {
  const error =
    input.error instanceof Error
      ? input.error.message
      : String(input.error ?? "Resend send failed");
  const row: MailDeadLetter = {
    id: crypto.randomUUID(),
    kind: input.kind,
    fromAddress: input.from,
    toAddress: input.to,
    subject: input.subject,
    bodyText: input.text,
    error: error.slice(0, 2000),
    status: "pending",
    createdAt: new Date().toISOString(),
    retriedAt: null,
  };

  if (mailDeadLetterUsesMemory()) {
    memoryRows().unshift(row);
    return row;
  }

  const db = getDb();
  if (!db) {
    throw new Error("Mail dead-letter requires DATABASE_URL.");
  }
  await db.insert(mailDeadLetters).values({
    id: row.id,
    kind: row.kind,
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    subject: row.subject,
    bodyText: row.bodyText,
    error: row.error,
    status: row.status,
  });
  return row;
}

export async function listMailDeadLetters(
  limit = 100,
): Promise<MailDeadLetter[]> {
  const capped = Math.min(Math.max(limit, 1), 500);
  if (mailDeadLetterUsesMemory()) {
    return memoryRows().slice(0, capped);
  }
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(mailDeadLetters)
    .orderBy(desc(mailDeadLetters.createdAt))
    .limit(capped);
  return rows.map((row) => ({
    id: row.id,
    kind: parseKind(row.kind),
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    subject: row.subject,
    bodyText: row.bodyText,
    error: row.error,
    status: parseStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    retriedAt: row.retriedAt ? row.retriedAt.toISOString() : null,
  }));
}

export async function getMailDeadLetter(
  id: string,
): Promise<MailDeadLetter | null> {
  if (mailDeadLetterUsesMemory()) {
    return memoryRows().find((row) => row.id === id) ?? null;
  }
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(mailDeadLetters)
    .where(eq(mailDeadLetters.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    kind: parseKind(row.kind),
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    subject: row.subject,
    bodyText: row.bodyText,
    error: row.error,
    status: parseStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    retriedAt: row.retriedAt ? row.retriedAt.toISOString() : null,
  };
}

/**
 * Operator retry — re-send via Resend (or test double). Marks status=sent.
 */
export async function retryMailDeadLetter(
  id: string,
): Promise<
  { ok: true; row: MailDeadLetter } | { ok: false; error: string }
> {
  const row = await getMailDeadLetter(id);
  if (!row) return { ok: false, error: "Dead-letter not found." };
  if (row.status === "sent") {
    return { ok: false, error: "Already retried successfully." };
  }

  const mailer = resolveRetryMailer(process.env.RESEND_API_KEY);
  if (!mailer) {
    return { ok: false, error: "Mailer unavailable for retry." };
  }

  try {
    await mailer.send({
      from: row.fromAddress,
      to: row.toAddress,
      subject: row.subject,
      text: row.bodyText,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "retry failed");
    if (mailDeadLetterUsesMemory()) {
      const live = memoryRows().find((item) => item.id === id);
      if (live) live.error = message.slice(0, 2000);
    } else {
      const db = getDb();
      if (db) {
        await db
          .update(mailDeadLetters)
          .set({ error: message.slice(0, 2000) })
          .where(eq(mailDeadLetters.id, id));
      }
    }
    return { ok: false, error: message };
  }

  const retriedAt = new Date().toISOString();
  if (mailDeadLetterUsesMemory()) {
    const live = memoryRows().find((item) => item.id === id);
    if (!live) return { ok: false, error: "Dead-letter not found." };
    live.status = "sent";
    live.retriedAt = retriedAt;
    return { ok: true, row: { ...live } };
  }

  const db = getDb();
  if (!db) return { ok: false, error: "Mail dead-letter requires DATABASE_URL." };
  const updated = await db
    .update(mailDeadLetters)
    .set({
      status: "sent",
      retriedAt: new Date(retriedAt),
    })
    .where(
      and(eq(mailDeadLetters.id, id), eq(mailDeadLetters.status, "pending")),
    )
    .returning();
  const next = updated[0];
  if (!next) return { ok: false, error: "Dead-letter not found." };
  return {
    ok: true,
    row: {
      id: next.id,
      kind: parseKind(next.kind),
      fromAddress: next.fromAddress,
      toAddress: next.toAddress,
      subject: next.subject,
      bodyText: next.bodyText,
      error: next.error,
      status: parseStatus(next.status),
      createdAt: next.createdAt.toISOString(),
      retriedAt: next.retriedAt ? next.retriedAt.toISOString() : null,
    },
  };
}
