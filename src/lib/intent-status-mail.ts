import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { resolveMagicLinkFrom } from "@/lib/auth/mode";
import { getDb } from "@/lib/db";
import { authUsers } from "@/lib/db/schema";
import {
  intentStatusEmailTemplate,
  type IntentStatusKind,
} from "@/emails/intent-status";
import type { IntentBid } from "@/lib/intent";

/** Payload Resend (or a test double) receives for intent status mail. */
export type IntentStatusMailPayload = {
  from: string;
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
}): { subject: string; text: string } {
  return intentStatusEmailTemplate(input);
}

/**
 * Slice 8.1 — notify the bidder on listed / outbid / approved / rejected.
 * Missing key/mailer/email = no-op. Throws are swallowed by callers.
 */
export async function notifyIntentStatus(input: {
  kind: IntentStatusKind;
  bid: IntentBid;
  note?: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const mailer = resolveMailer(key);
  if (!mailer) return;

  const to = await resolveIntentBidderEmail(input.bid.userId);
  if (!to) return;

  const body = buildIntentStatusMail(input);
  await mailer.send({
    from: resolveMagicLinkFrom(),
    to,
    subject: body.subject,
    text: body.text,
  });
}
