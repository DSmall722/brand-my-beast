import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { authUsers } from "@/lib/db/schema";
import {
  intentStatusEmailTemplate,
  type IntentStatusKind,
} from "@/emails/intent-status";
import type { IntentBid } from "@/lib/intent";
import { appendMailDeadLetter } from "@/lib/mail-dead-letter";
import { outboundMailEnvelope } from "@/lib/mail-envelope";

/** Payload Resend (or a test double) receives for intent status mail. */
export type IntentStatusMailPayload = {
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  text: string;
};

export type IntentStatusMailer = {
  send: (payload: IntentStatusMailPayload) => Promise<unknown>;
};

export type { IntentStatusKind };

const globalStore = globalThis as typeof globalThis & {
  __bmbIntentStatusMailer?: IntentStatusMailer | null;
};

/**
 * Slice 8.1 — inject a Resend double in Playwright. Pass null to clear.
 * Live mail is never sent from the agent / CI.
 */
export function setIntentStatusMailerForTests(
  mailer: IntentStatusMailer | null,
): void {
  globalStore.__bmbIntentStatusMailer = mailer;
}

export function resetIntentStatusMailerForTests(): void {
  globalStore.__bmbIntentStatusMailer = null;
}

function resolveMailer(apiKey: string | undefined): IntentStatusMailer | null {
  if (globalStore.__bmbIntentStatusMailer) {
    return globalStore.__bmbIntentStatusMailer;
  }
  if (!apiKey) return null;
  const resend = new Resend(apiKey);
  return {
    send: (payload) => resend.emails.send(payload),
  };
}

/** Test-mode user ids are `test:<email>`. */
export function emailFromTestUserId(userId: string): string | null {
  if (!userId.startsWith("test:")) return null;
  const email = userId.slice("test:".length).trim().toLowerCase();
  return email.includes("@") ? email : null;
}

/** Resolve bidder inbox for status mail. Missing = skip send. */
export async function resolveIntentBidderEmail(
  userId: string,
): Promise<string | null> {
  const fromTest = emailFromTestUserId(userId);
  if (fromTest) return fromTest;

  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select({ email: authUsers.email })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  const email = rows[0]?.email?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

export function buildIntentStatusMail(input: {
  kind: IntentStatusKind;
  bid: IntentBid;
  note?: string;
  nextMinimumUsd?: number;
}): { subject: string; text: string } {
  return intentStatusEmailTemplate(input);
}

/**
 * Slice 8.1 — notify the bidder on listed / outbid / approved / rejected.
 * Missing key/mailer/email = no-op. Throws are swallowed by callers.
 * Slice 13.18 — outbid includes next minimum (9.2) when provided.
 */
export async function notifyIntentStatus(input: {
  kind: IntentStatusKind;
  bid: IntentBid;
  note?: string;
  nextMinimumUsd?: number;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const mailer = resolveMailer(key);
  if (!mailer) return;

  const to = await resolveIntentBidderEmail(input.bid.userId);
  if (!to) return;

  const body = buildIntentStatusMail(input);
  const { from, replyTo } = outboundMailEnvelope();
  const payload = {
    from,
    replyTo,
    to,
    subject: body.subject,
    text: body.text,
  };
  try {
    await mailer.send(payload);
  } catch (error) {
    try {
      await appendMailDeadLetter({
        kind: "intent-status",
        ...payload,
        error,
      });
    } catch {
      // Dead-letter write must not mask the original send failure path.
    }
  }
}
