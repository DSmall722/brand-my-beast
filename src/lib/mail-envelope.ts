import { BRAND } from "./campaign";

export const MAIL_FROM = `${BRAND.name} <${BRAND.email}>` as const;

export const MAIL_REPLY_TO = BRAND.email;

export type MailEnvelope = {
  from: string;
  replyTo: string;
};

type EnvBag = Record<string, string | undefined>;

export function outboundMailEnvelope(env: EnvBag = process.env): MailEnvelope {
  const override = env.RESEND_FROM?.trim();
  const from = override || MAIL_FROM;
  return {
    from,
    replyTo: MAIL_REPLY_TO,
  };
}

export function addressIsHelloAt(value: string): boolean {
  const lower = value.trim().toLowerCase();
  if (lower === BRAND.email) return true;
  return lower.includes(`<${BRAND.email}>`) || lower.endsWith(BRAND.email);
}

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
