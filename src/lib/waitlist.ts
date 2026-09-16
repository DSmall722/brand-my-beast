import { desc, eq } from "drizzle-orm";
import { Resend } from "resend";
import { z } from "zod";
import { waitlistConfirmEmailTemplate } from "@/emails/waitlist-confirm";
import { waitlistOperatorEmailTemplate } from "@/emails/waitlist-operator";
import { BRAND } from "./campaign";
import { getDb } from "./db";
import { waitlistSignups } from "./db/schema";
import { appendMailDeadLetter } from "./mail-dead-letter";
import { PUBLIC_COPY } from "./public-copy";

export const waitlistEmailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export type WaitlistResult =
  | { ok: true; status: "created" | "exists" }
  | { ok: false; error: string; code: "invalid" | "unavailable" | "failed" };

export type WaitlistConfirmResult =
  | { ok: true; email: string; status: "confirmed" | "already" }
  | { ok: false; error: string; code: "invalid" | "unavailable" | "failed" };

export type WaitlistRow = {
  email: string;
  createdAt: string;
  userId: string | null;
  source: string;
  /** Slice 12.14 — null after confirm (or legacy rows). */
  confirmToken: string | null;
  /** Slice 12.14 — set when double opt-in completes. */
  confirmedAt: string | null;
};

/** Payload Resend (or a test double) receives on waitlist insert. */
export type WaitlistNotifyPayload = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export type WaitlistMailer = {
  send: (payload: WaitlistNotifyPayload) => Promise<unknown>;
};

type MemoryRow = WaitlistRow;

const globalStore = globalThis as typeof globalThis & {
  __bmbWaitlistMemory?: Map<string, MemoryRow>;
  __bmbWaitlistMailer?: WaitlistMailer | null;
};

function memoryStore(): Map<string, MemoryRow> {
  if (!globalStore.__bmbWaitlistMemory) {
    globalStore.__bmbWaitlistMemory = new Map();
  }
  return globalStore.__bmbWaitlistMemory;
}

function newConfirmToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

/** Public confirm URL for the double-opt-in mail. */
export function waitlistConfirmUrl(token: string): string {
  const base =
    process.env.WAITLIST_CONFIRM_BASE_URL?.replace(/\/$/, "") ??
    `https://${BRAND.domain}`;
  return `${base}/waitlist/confirm?token=${encodeURIComponent(token)}`;
}

function rowFromDb(row: typeof waitlistSignups.$inferSelect): WaitlistRow {
  return {
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    userId: row.userId ?? null,
    source: row.source,
    confirmToken: row.confirmToken ?? null,
    confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
  };
}

/**
 * Slice 7.6 — inject a Resend double in Playwright. Pass null to clear.
 * Live mail is never sent from the agent / CI.
 */
export function setWaitlistMailerForTests(
  mailer: WaitlistMailer | null,
): void {
  globalStore.__bmbWaitlistMailer = mailer;
}

function resolveMailer(apiKey: string | undefined): WaitlistMailer | null {
  if (globalStore.__bmbWaitlistMailer) {
    return globalStore.__bmbWaitlistMailer;
  }
  if (!apiKey) return null;
  const resend = new Resend(apiKey);
  return {
    send: (payload) => resend.emails.send(payload),
  };
}

type WaitlistStoreEnv = {
  VERCEL_ENV?: string;
  WAITLIST_MODE?: string;
  DATABASE_URL?: string;
  NODE_ENV?: string;
};

/**
 * Memory is CI/local only. Vercel Production never uses memory (SLICES 6.7),
 * even if WAITLIST_MODE=memory is mis-set. Local `next build` without
 * DATABASE_URL still uses memory when VERCEL_ENV is unset.
 */
export function waitlistStoreUsesMemory(
  env: WaitlistStoreEnv = process.env as WaitlistStoreEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.WAITLIST_MODE === "memory") return true;
  if (env.WAITLIST_MODE === "postgres") return false;
  return !env.DATABASE_URL && env.NODE_ENV !== "production";
}

function useMemoryStore(): boolean {
  return waitlistStoreUsesMemory();
}

/**
 * Slice 12.14 — confirm-link mail to the subscriber (double opt-in).
 * Missing key / mailer = no-op.
 */
async function notifyConfirmLink(
  email: string,
  token: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const mailer = resolveMailer(key);
  if (!mailer) return;

  const from =
    process.env.RESEND_FROM ?? `${BRAND.name} <${BRAND.email}>`;
  const body = waitlistConfirmEmailTemplate({
    email,
    confirmUrl: waitlistConfirmUrl(token),
  });

  try {
    await mailer.send({
      from,
      to: email,
      subject: body.subject,
      text: body.text,
    });
  } catch (error) {
    try {
      await appendMailDeadLetter({
        kind: "waitlist",
        from,
        to: email,
        subject: body.subject,
        text: body.text,
        error,
      });
    } catch {
      // Dead-letter write is best-effort.
    }
  }
}

/**
 * Slice 7.6 — notify hello@ after double opt-in confirms.
 * Missing key / mailer = no-op.
 */
async function notifyOperator(email: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const mailer = resolveMailer(key);
  if (!mailer) return;

  const from =
    process.env.RESEND_FROM ?? `${BRAND.name} <${BRAND.email}>`;
  const to = process.env.WAITLIST_NOTIFY_TO ?? BRAND.email;
  const body = waitlistOperatorEmailTemplate(email);

  try {
    await mailer.send({
      from,
      to,
      subject: body.subject,
      text: body.text,
    });
  } catch (error) {
    try {
      await appendMailDeadLetter({
        kind: "waitlist",
        from,
        to,
        subject: body.subject,
        text: body.text,
        error,
      });
    } catch {
      // Dead-letter write is best-effort.
    }
  }
}

/**
 * Slice 6.5 — write outcome is authoritative. Notify failures must not
 * flip a successful insert into a false "could not save" (and must never
 * claim join when the write failed).
 * Slice 12.14 — create stores a confirm token; operator mail waits for confirm.
 */
export async function joinWaitlist(rawEmail: string): Promise<WaitlistResult> {
  const parsed = waitlistEmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email.", code: "invalid" };
  }

  const email = parsed.data;
  let saved: WaitlistResult;
  let confirmToken: string | null = null;

  try {
    if (useMemoryStore()) {
      const store = memoryStore();
      if (store.has(email)) {
        saved = { ok: true, status: "exists" };
      } else {
        confirmToken = newConfirmToken();
        store.set(email, {
          email,
          createdAt: new Date().toISOString(),
          userId: null,
          source: "p1-waitlist",
          confirmToken,
          confirmedAt: null,
        });
        saved = { ok: true, status: "created" };
      }
    } else {
      const db = getDb();
      if (!db) {
        return {
          ok: false,
          error: PUBLIC_COPY.waitlist.unavailable,
          code: "unavailable",
        };
      }

      const existing = await db
        .select({ email: waitlistSignups.email })
        .from(waitlistSignups)
        .where(eq(waitlistSignups.email, email))
        .limit(1);

      if (existing.length > 0) {
        saved = { ok: true, status: "exists" };
      } else {
        confirmToken = newConfirmToken();
        await db.insert(waitlistSignups).values({
          email,
          confirmToken,
          confirmedAt: null,
        });
        saved = { ok: true, status: "created" };
      }
    }
  } catch {
    return {
      ok: false,
      error: PUBLIC_COPY.waitlist.failed,
      code: "failed",
    };
  }

  if (saved.ok && saved.status === "created" && confirmToken) {
    try {
      await notifyConfirmLink(email, confirmToken);
    } catch {
      // Row is already saved — do not tell the user the write failed.
    }
  }

  return saved;
}

/**
 * Slice 12.14 — consume confirm token; then notify operator (hello@).
 */
export async function confirmWaitlistByToken(
  rawToken: string,
): Promise<WaitlistConfirmResult> {
  const token = String(rawToken ?? "").trim();
  if (token.length < 16) {
    return { ok: false, error: "Invalid confirm link.", code: "invalid" };
  }

  try {
    if (useMemoryStore()) {
      const store = memoryStore();
      let match: MemoryRow | undefined;
      for (const row of store.values()) {
        if (row.confirmToken === token) {
          match = row;
          break;
        }
      }
      if (!match) {
        return { ok: false, error: "Confirm link expired or unknown.", code: "invalid" };
      }
      if (match.confirmedAt) {
        return { ok: true, email: match.email, status: "already" };
      }
      const next: MemoryRow = {
        ...match,
        confirmToken: null,
        confirmedAt: new Date().toISOString(),
      };
      store.set(match.email, next);
      try {
        await notifyOperator(match.email);
      } catch {
        // Confirmed anyway.
      }
      return { ok: true, email: match.email, status: "confirmed" };
    }

    const db = getDb();
    if (!db) {
      return {
        ok: false,
        error: PUBLIC_COPY.waitlist.unavailable,
        code: "unavailable",
      };
    }

    const rows = await db
      .select()
      .from(waitlistSignups)
      .where(eq(waitlistSignups.confirmToken, token))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { ok: false, error: "Confirm link expired or unknown.", code: "invalid" };
    }
    if (row.confirmedAt) {
      return { ok: true, email: row.email, status: "already" };
    }

    const confirmedAt = new Date();
    await db
      .update(waitlistSignups)
      .set({ confirmedAt, confirmToken: null })
      .where(eq(waitlistSignups.email, row.email));

    try {
      await notifyOperator(row.email);
    } catch {
      // Confirmed anyway.
    }
    return { ok: true, email: row.email, status: "confirmed" };
  } catch {
    return {
      ok: false,
      error: PUBLIC_COPY.waitlist.failed,
      code: "failed",
    };
  }
}

/** Look up a waitlist row by email. Never deletes. */
export async function getWaitlistByEmail(
  rawEmail: string,
): Promise<WaitlistRow | null> {
  const parsed = waitlistEmailSchema.safeParse(rawEmail);
  if (!parsed.success) return null;
  const email = parsed.data;

  if (useMemoryStore()) {
    return memoryStore().get(email) ?? null;
  }

  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(waitlistSignups)
    .where(eq(waitlistSignups.email, email))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return rowFromDb(row);
}

/**
 * Link a signed-in account to an existing waitlist row by email.
 * Updates userId in place — never deletes or recreates the row.
 */
export async function attachWaitlistAccount(input: {
  email: string;
  userId: string;
}): Promise<WaitlistRow | null> {
  const parsed = waitlistEmailSchema.safeParse(input.email);
  if (!parsed.success || !input.userId.trim()) return null;
  const email = parsed.data;
  const userId = input.userId.trim();

  if (useMemoryStore()) {
    const store = memoryStore();
    const existing = store.get(email);
    if (!existing) return null;
    const next: MemoryRow = {
      ...existing,
      userId: existing.userId ?? userId,
    };
    store.set(email, next);
    return next;
  }

  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(waitlistSignups)
    .where(eq(waitlistSignups.email, email))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  if (!row.userId) {
    await db
      .update(waitlistSignups)
      .set({ userId })
      .where(eq(waitlistSignups.email, email));
  }

  const refreshed = await getWaitlistByEmail(email);
  return refreshed;
}

/**
 * Slice 7.5 — operator waitlist board. Newest first.
 * Memory in CI/local; Postgres when configured. Never tweets / exports to X.
 */
export async function listWaitlistSignups(): Promise<WaitlistRow[]> {
  if (useMemoryStore()) {
    return [...memoryStore().values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(waitlistSignups)
    .orderBy(desc(waitlistSignups.createdAt));

  return rows.map((row) => rowFromDb(row));
}

/** CI helper — clear memory waitlist and any injected mailer. */
export function resetWaitlistStoreForTests(): void {
  memoryStore().clear();
  globalStore.__bmbWaitlistMailer = null;
}
