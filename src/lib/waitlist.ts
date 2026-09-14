import { eq } from "drizzle-orm";
import { z } from "zod";
import { BRAND } from "./campaign";
import { getDb } from "./db";
import { waitlistSignups } from "./db/schema";
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

type MemoryRow = WaitlistRow;

const globalStore = globalThis as typeof globalThis & {
  __bmbWaitlistMemory?: Map<string, MemoryRow>;
};

function memoryStore(): Map<string, MemoryRow> {
  if (!globalStore.__bmbWaitlistMemory) {
    globalStore.__bmbWaitlistMemory = new Map();
  }
  return globalStore.__bmbWaitlistMemory;
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

async function notifyOperator(email: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const from =
    process.env.RESEND_FROM ?? `${BRAND.name} <${BRAND.email}>`;
  const to = process.env.WAITLIST_NOTIFY_TO ?? BRAND.email;

  await resend.emails.send({
    from,
    to,
    subject: `Waitlist: ${email}`,
    text: `${email} joined the BrandMyBeast waitlist.`,
  });
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

/** CI helper — clear memory waitlist only. */
export function resetWaitlistStoreForTests(): void {
  memoryStore().clear();
}
