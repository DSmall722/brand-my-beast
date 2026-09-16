/**
 * Slice 12.20 — outbound From + Reply-To both hello@brandmybeast.com.
 * No personal inbox. Unit-asserted. Not a charge path.
 */

import { BRAND } from "./campaign";

/** Canonical From header: display name + hello@. */
export const MAIL_FROM = `${BRAND.name} <${BRAND.email}>` as const;

/** Reply-To is always the public hello@ address. */
export const MAIL_REPLY_TO = BRAND.email;

export type MailEnvelope = {
  from: string;
  replyTo: string;
};

type EnvBag = Record<string, string | undefined>;

/**
 * Resolve From (RESEND_FROM override allowed) + Reply-To (always hello@).
 * Override may change display form but must still address hello@.
 */
export function outboundMailEnvelope(env: EnvBag = process.env): MailEnvelope {
  const override = env.RESEND_FROM?.trim();
  const from = override || MAIL_FROM;
  return {
    from,
    replyTo: MAIL_REPLY_TO,
  };
}

/** True when an address string targets hello@brandmybeast.com. */
export function addressIsHelloAt(value: string): boolean {
  const lower = value.trim().toLowerCase();
  if (lower === BRAND.email) return true;
  // Angle-addr form: Name <hello@brandmybeast.com>
  return lower.includes(`<${BRAND.email}>`) || lower.endsWith(BRAND.email);
}

/**
 * Unit assert — both From and Reply-To must be hello@.
 * Throws when either address is wrong (never a personal inbox).
 */
export function assertOutboundMailEnvelope(payload: {
  from: string;
  replyTo: string;
}): void {
  if (!addressIsHelloAt(payload.from)) {
    throw new Error(
      `Outbound From must be ${BRAND.email} (got ${payload.from}).`,
    );
  }
  if (payload.replyTo.trim().toLowerCase() !== BRAND.email) {
    throw new Error(
      `Outbound Reply-To must be ${BRAND.email} (got ${payload.replyTo}).`,
    );
  }
}
