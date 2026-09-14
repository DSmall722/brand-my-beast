import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import { waitlistSignups } from "./db/schema";
import { BRAND } from "./campaign";

export const waitlistEmailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export type WaitlistResult =
  | { ok: true; status: "created" | "exists" }
  | { ok: false; error: string; code: "invalid" | "unavailable" | "failed" };

type MemoryRow = { email: string; createdAt: string };

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
      store.set(email, { email, createdAt: new Date().toISOString() });
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
