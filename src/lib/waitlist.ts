import { desc, eq } from "drizzle-orm";
import { Resend } from "resend";
import { z } from "zod";
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

export type WaitlistRow = {
  email: string;
  createdAt: string;
  userId: string | null;
  source: string;
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
 * Slice 7.6 — notify hello@ on insert via Resend.
 * Missing key / mailer = no-op. Throw is swallowed by joinWaitlist.
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
 */
export async function joinWaitlist(rawEmail: string): Promise<WaitlistResult> {
  const parsed = waitlistEmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email.", code: "invalid" };
  }

  const email = parsed.data;
  let saved: WaitlistResult;

  try {
    if (useMemoryStore()) {
      const store = memoryStore();
      if (store.has(email)) {
        saved = { ok: true, status: "exists" };
      } else {
        store.set(email, {
          email,
          createdAt: new Date().toISOString(),
          userId: null,
          source: "p1-waitlist",
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
        await db.insert(waitlistSignups).values({ email });
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

  if (saved.ok && saved.status === "created") {
    try {
      await notifyOperator(email);
    } catch {
      // Row is already saved — do not tell the user the write failed.
    }
  }

  return saved;
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
  return {
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    userId: row.userId ?? null,
    source: row.source,
  };
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

  return rows.map((row) => ({
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    userId: row.userId ?? null,
    source: row.source,
  }));
}

/** CI helper — clear memory waitlist and any injected mailer. */
export function resetWaitlistStoreForTests(): void {
  memoryStore().clear();
  globalStore.__bmbWaitlistMailer = null;
}
