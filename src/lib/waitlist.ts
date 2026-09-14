import { eq } from "drizzle-orm";
import { z } from "zod";
import { BRAND } from "./campaign";
import { getDb } from "./db";
import { waitlistSignups } from "./db/schema";

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

function useMemoryStore(): boolean {
  return (
    process.env.WAITLIST_MODE === "memory" ||
    (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production")
  );
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

export async function joinWaitlist(rawEmail: string): Promise<WaitlistResult> {
  const parsed = waitlistEmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email.", code: "invalid" };
  }

  const email = parsed.data;

  try {
    if (useMemoryStore()) {
      const store = memoryStore();
      if (store.has(email)) {
        return { ok: true, status: "exists" };
      }
      store.set(email, {
        email,
        createdAt: new Date().toISOString(),
        userId: null,
        source: "p1-waitlist",
      });
      await notifyOperator(email);
      return { ok: true, status: "created" };
    }

    const db = getDb();
    if (!db) {
      return {
        ok: false,
        error: "Waitlist is not configured yet.",
        code: "unavailable",
      };
    }

    const existing = await db
      .select({ email: waitlistSignups.email })
      .from(waitlistSignups)
      .where(eq(waitlistSignups.email, email))
      .limit(1);

    if (existing.length > 0) {
      return { ok: true, status: "exists" };
    }

    await db.insert(waitlistSignups).values({ email });
    await notifyOperator(email);
    return { ok: true, status: "created" };
  } catch {
    return {
      ok: false,
      error: "Could not save that email. Try again.",
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
