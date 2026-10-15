import { createHash } from "node:crypto";

export type WaitlistInsertLog = {
  at: string;
  event: "waitlist.insert";
  emailHash: string;
  status: "created";
};

export type IntentStatusLog = {
  at: string;
  event: "intent.status";
  bidId: string;
  panelId: string;
  status: string;
  userHash: string;
};

export type MagicLinkRequestLog = {
  at: string;
  event: "magic-link.request";
  emailHash: string;
  status: "requested" | "rate_limited";
};

export type InternalSendMailLog = {
  at: string;
  event: "internal-send-mail";
  to: string[];
  subject: string;
  messageId: string;
};

export type StructuredLogEntry =
  | WaitlistInsertLog
  | IntentStatusLog
  | MagicLinkRequestLog
  | InternalSendMailLog;

const globalLog = globalThis as typeof globalThis & {
  __bmbStructuredLogs?: StructuredLogEntry[];
};

function logBuffer(): StructuredLogEntry[] {
  if (!globalLog.__bmbStructuredLogs) {
    globalLog.__bmbStructuredLogs = [];
  }
  return globalLog.__bmbStructuredLogs;
}

function push(entry: StructuredLogEntry): StructuredLogEntry {
  const logs = logBuffer();
  logs.push(entry);
  if (logs.length > 200) logs.splice(0, logs.length - 200);
  console.info(`[${entry.event}]`, JSON.stringify(entry));
  return entry;
}

export function hashEmailForLog(value: string): string {
  return createHash("sha256")
    .update(`bmb-structured-log:${value.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 16);
}

export function logWaitlistInsert(email: string): WaitlistInsertLog {
  return push({
    at: new Date().toISOString(),
    event: "waitlist.insert",
    emailHash: hashEmailForLog(email),
    status: "created",
  }) as WaitlistInsertLog;
}

export function logIntentStatusChange(input: {
  bidId: string;
  panelId: string;
  status: string;
  userId: string;
}): IntentStatusLog {
  return push({
    at: new Date().toISOString(),
    event: "intent.status",
    bidId: input.bidId,
    panelId: input.panelId,
    status: input.status,
    userHash: hashEmailForLog(input.userId),
  }) as IntentStatusLog;
}

export function logMagicLinkRequest(
  email: string,
  status: MagicLinkRequestLog["status"] = "requested",
): MagicLinkRequestLog {
  return push({
    at: new Date().toISOString(),
    event: "magic-link.request",
    emailHash: hashEmailForLog(email),
    status,
  }) as MagicLinkRequestLog;
}

export function logInternalSendMail(input: {
  to: string[];
  subject: string;
  messageId: string;
}): InternalSendMailLog {
  return push({
    at: new Date().toISOString(),
    event: "internal-send-mail",
    to: input.to,
    subject: input.subject,
    messageId: input.messageId,
  }) as InternalSendMailLog;
}

export function listStructuredLogsForTests(): readonly StructuredLogEntry[] {
  return logBuffer().slice();
}

export function resetStructuredLogsForTests(): void {
  logBuffer().length = 0;
}
