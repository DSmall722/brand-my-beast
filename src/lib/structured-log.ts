/**
 * Slice 12.41 — structured ops logs. No PII beyond a short email hash.
 */

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
  /** Hashed user id / email — never raw. */
  userHash: string;
};

export type StructuredLogEntry = WaitlistInsertLog | IntentStatusLog;

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

/** Short hex digest for logs. Never log the raw email or user id. */
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

export function listStructuredLogsForTests(): readonly StructuredLogEntry[] {
  return logBuffer().slice();
}

export function resetStructuredLogsForTests(): void {
  logBuffer().length = 0;
}
