/**
 * Slice 14.39 — Resend bounce webhook → mail dead-letter.
 * No live Resend hook required to merge. Optional RESEND_WEBHOOK_SECRET.
 * CLOSE_AT null. Cards never charged. Not a charge path.
 */

import { BRAND } from "./campaign";
import { MAIL_FROM } from "./mail-envelope";
import {
  appendMailDeadLetter,
  type MailDeadLetter,
} from "./mail-dead-letter";

export const RESEND_BOUNCE_EVENT = "email.bounced" as const;

export type ResendBounceWebhookResult =
  | { ok: true; ignored: true; reason: string }
  | { ok: true; ignored: false; row: MailDeadLetter }
  | { ok: false; error: string };

type EnvBag = Record<string, string | undefined>;

/**
 * When RESEND_WEBHOOK_SECRET is set, require Bearer match.
 * When unset, accept (slice: no live hook required to merge).
 */
export function isAuthorizedResendWebhook(
  request: Request,
  env: EnvBag = process.env,
): boolean {
  const secret = env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (auth === `Bearer ${secret}`) return true;
  const header = request.headers.get("x-resend-webhook-secret")?.trim() ?? "";
  return header === secret;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function firstTo(data: Record<string, unknown>): string | null {
  const to = data.to;
  if (typeof to === "string" && to.trim()) return to.trim();
  if (Array.isArray(to)) {
    for (const item of to) {
      if (typeof item === "string" && item.trim()) return item.trim();
    }
  }
  return null;
}

function bounceMessage(data: Record<string, unknown>): string {
  const bounce = asRecord(data.bounce);
  if (bounce && typeof bounce.message === "string" && bounce.message.trim()) {
    return bounce.message.trim();
  }
  if (typeof data.bounce === "string" && data.bounce.trim()) {
    return data.bounce.trim();
  }
  return "Resend email.bounced";
}

/**
 * Parse a Resend webhook JSON body. Only email.bounced writes a dead-letter.
 */
export async function handleResendBounceWebhookBody(
  body: unknown,
): Promise<ResendBounceWebhookResult> {
  const root = asRecord(body);
  if (!root) {
    return { ok: false, error: "Expected JSON object." };
  }

  const type = typeof root.type === "string" ? root.type : "";
  if (type !== RESEND_BOUNCE_EVENT) {
    return {
      ok: true,
      ignored: true,
      reason: type ? `Ignored event ${type}.` : "Ignored non-bounce event.",
    };
  }

  const data = asRecord(root.data) ?? {};
  const to = firstTo(data);
  if (!to) {
    return { ok: false, error: "Bounce event missing to address." };
  }

  const from =
    typeof data.from === "string" && data.from.trim()
      ? data.from.trim()
      : MAIL_FROM;
  const subject =
    typeof data.subject === "string" && data.subject.trim()
      ? data.subject.trim()
      : "Resend bounce";
  const emailId =
    typeof data.email_id === "string" && data.email_id.trim()
      ? data.email_id.trim()
      : "";
  const message = bounceMessage(data);
  const text = [
    "Resend bounce (email.bounced).",
    emailId ? `email_id=${emailId}` : null,
    `to=${to}`,
    message,
    `Public mail: ${BRAND.email}. Still not charged.`,
  ]
    .filter(Boolean)
    .join("\n");

  const row = await appendMailDeadLetter({
    kind: "bounce",
    from,
    to,
    subject,
    text,
    error: message,
  });

  return { ok: true, ignored: false, row };
}
