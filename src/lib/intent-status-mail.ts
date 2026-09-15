import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { resolveMagicLinkFrom } from "@/lib/auth/mode";
import { BRAND, formatUsd } from "@/lib/campaign";
import { getDb } from "@/lib/db";
import { authUsers } from "@/lib/db/schema";
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

export type IntentStatusKind =
  | "listed"
  | "outbid"
  | "approved"
  | "rejected";

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
  const panel = input.bid.panelId;
  const mark = formatUsd(input.bid.standingUsd);
  const brand = input.bid.brandLabel;

  switch (input.kind) {
    case "listed":
      return {
        subject: `Intent listed — ${panel} at ${mark}`,
        text: [
          `Your intent for ${brand} on ${panel} is listed at ${mark}.`,
          "This is intent only. No card was charged.",
          `— ${BRAND.name}`,
        ].join("\n"),
      };
    case "outbid":
      return {
        subject: `Outbid on ${panel}`,
        text: [
          `Your standing mark on ${panel} (${brand}, ${mark}) was outbid.`,
          "You can place a higher intent when you are ready. No card was charged.",
          `— ${BRAND.name}`,
        ].join("\n"),
      };
    case "approved":
      return {
        subject: `Intent approved — ${panel}`,
        text: [
          `Your intent for ${brand} on ${panel} at ${mark} was approved.`,
          "Still intent only until the money path is live. No card was charged.",
          `— ${BRAND.name}`,
        ].join("\n"),
      };
    case "rejected": {
      const note = input.note?.trim();
      return {
        subject: `Intent rejected — ${panel}`,
        text: [
          `Your intent for ${brand} on ${panel} at ${mark} was rejected.`,
          note ? `Operator note: ${note}` : "No operator note was attached.",
          "No card was charged.",
          `— ${BRAND.name}`,
        ].join("\n"),
      };
    }
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
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
