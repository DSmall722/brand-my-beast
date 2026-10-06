/**
 * BMB-MAIL-1 — internal send via ImprovMX SMTP.
 * Auth is Bearer INTERNAL_MAIL_TOKEN. From is not caller-controllable.
 */

import { timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { z } from "zod";
import { BRAND } from "./campaign";
import { logInternalSendMail } from "./structured-log";
import { isProductionRuntime } from "./test-api-gate";

export const INTERNAL_MAIL_FROM =
  '"DJ at BrandMyBeast" <hello@brandmybeast.com>' as const;
export const INTERNAL_MAIL_ENVELOPE_FROM = BRAND.email;
export const INTERNAL_MAIL_REPLY_TO_DEFAULT = BRAND.email;

export const IMPROVMX_SMTP_HOST = "smtp.improvmx.com" as const;
export const IMPROVMX_SMTP_PORT = 587 as const;

const RATE_MAX = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const TOKEN_MIN_LENGTH = 32;
const INVALID = { error: "invalid payload" } as const;

export type InternalMailEnv = {
  INTERNAL_MAIL_TOKEN?: string;
  IMPROVMX_SMTP_USER?: string;
  IMPROVMX_SMTP_PASS?: string;
  INTERNAL_MAIL_TRANSPORT?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

export type SmtpAuth = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth: { user: string; pass: string };
};

export type InternalMailPayload = {
  from: string;
  to: string | string[];
  cc?: string | string[];
  replyTo: string;
  subject: string;
  text: string;
  html?: string;
  envelope: { from: string; to: string[] };
};

export type InternalMailTransport = {
  sendMail: (mail: InternalMailPayload) => Promise<{ messageId?: string }>;
};

export type InternalSendMailDeps = {
  env?: InternalMailEnv;
  createTransport?: (smtp: SmtpAuth) => InternalMailTransport;
};

const email = z.string().trim().email();

const bodySchema = z
  .object({
    to: z.union([email, z.array(email).min(1).max(10)]),
    subject: z
      .string()
      .min(1)
      .max(200)
      .refine((value) => !/[\r\n]/.test(value)),
    text: z.string().min(1).max(50_000),
    html: z.string().max(200_000).optional(),
    replyTo: email.optional(),
    cc: z.union([email, z.array(email).max(10)]).optional(),
  })
  .strict();

type RateBucket = { count: number; windowStart: number };

const globalStore = globalThis as typeof globalThis & {
  __bmbInternalMailRate?: RateBucket;
};

function rateBucket(): RateBucket {
  const existing = globalStore.__bmbInternalMailRate;
  if (existing) return existing;
  const created = { count: 0, windowStart: Date.now() };
  globalStore.__bmbInternalMailRate = created;
  return created;
}

export function resetInternalMailRateLimitForTests(): void {
  globalStore.__bmbInternalMailRate = { count: 0, windowStart: Date.now() };
}

export function internalMailUsesJsonTransport(
  env: InternalMailEnv = process.env,
): boolean {
  if (isProductionRuntime(env)) return false;
  return env.INTERNAL_MAIL_TRANSPORT === "json";
}

function asList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function bearerAuthorized(header: string | null, token: string): boolean {
  if (!header || !header.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length);
  const a = Buffer.from(provided);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status });
}

function defaultCreateTransport(
  env: InternalMailEnv,
): (smtp: SmtpAuth) => InternalMailTransport {
  return (smtp) => {
    if (internalMailUsesJsonTransport(env)) {
      return nodemailer.createTransport({ jsonTransport: true });
    }
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      requireTLS: smtp.requireTLS,
      auth: smtp.auth,
    });
  };
}

function consumeRateLimit(): boolean {
  const now = Date.now();
  let bucket = rateBucket();
  if (now - bucket.windowStart >= RATE_WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    globalStore.__bmbInternalMailRate = bucket;
  }
  if (bucket.count >= RATE_MAX) return false;
  bucket.count += 1;
  return true;
}

export async function handleInternalSendMail(
  request: Request,
  deps: InternalSendMailDeps = {},
): Promise<Response> {
  const env = deps.env ?? process.env;
  const token = env.INTERNAL_MAIL_TOKEN ?? "";
  if (
    token.length < TOKEN_MIN_LENGTH ||
    !bearerAuthorized(request.headers.get("authorization"), token)
  ) {
    return json(401, { error: "unauthorized" });
  }

  if (!consumeRateLimit()) {
    return json(429, { error: "rate limited" });
  }

  const user = env.IMPROVMX_SMTP_USER?.trim() ?? "";
  const pass = env.IMPROVMX_SMTP_PASS?.trim() ?? "";
  if (!user || !pass) {
    return json(503, { error: "mail not configured" });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(400, INVALID);
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, INVALID);
  }

  const payload = parsed.data;
  const toList = asList(payload.to);
  const ccList = asList(payload.cc);
  const mail: InternalMailPayload = {
    from: INTERNAL_MAIL_FROM,
    to: payload.to,
    replyTo: payload.replyTo ?? INTERNAL_MAIL_REPLY_TO_DEFAULT,
    subject: payload.subject,
    text: payload.text,
    envelope: {
      from: INTERNAL_MAIL_ENVELOPE_FROM,
      to: [...toList, ...ccList],
    },
  };
  if (payload.cc !== undefined) mail.cc = payload.cc;
  if (payload.html !== undefined) mail.html = payload.html;

  const smtp: SmtpAuth = {
    host: IMPROVMX_SMTP_HOST,
    port: IMPROVMX_SMTP_PORT,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  };
  const createTransport =
    deps.createTransport ?? defaultCreateTransport(env);

  let messageId = "";
  try {
    const info = await createTransport(smtp).sendMail(mail);
    messageId = info.messageId ?? "";
  } catch {
    return json(502, { error: "send failed" });
  }

  logInternalSendMail({
    to: toList,
    subject: payload.subject,
    messageId,
  });

  return json(200, { ok: true, messageId });
}
