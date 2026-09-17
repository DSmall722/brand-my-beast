import { neon } from "@neondatabase/serverless";
import { listWaitlistSignups } from "@/lib/waitlist";

/**
 * Slice 11.5 — operator-only status (DB ping + waitlist count).
 * Slice 13.45 — last digest timestamp for /operator/health.
 * Not a public URL. Lives on `/operator` behind auth + OPERATOR_EMAILS.
 */

export type OperatorDbPingStatus = "memory" | "ok" | "down";

export type OperatorDbPing = {
  status: OperatorDbPingStatus;
  label: string;
};

export type OperatorStatus = {
  db: OperatorDbPing;
  waitlistCount: number;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbLastOperatorDigestAt?: string | null;
};

/** ISO timestamp of the last successful operator digest send, or null. */
export function getLastOperatorDigestAt(): string | null {
  return globalStore.__bmbLastOperatorDigestAt ?? null;
}

/** Record a successful digest send (slice 13.45). */
export function recordOperatorDigestSentAt(iso: string): void {
  globalStore.__bmbLastOperatorDigestAt = iso;
}

/** Playwright helper — clear the in-process digest clock. */
export function resetLastOperatorDigestAtForTests(): void {
  globalStore.__bmbLastOperatorDigestAt = null;
}

export async function pingDatabase(
  env: NodeJS.ProcessEnv = process.env,
): Promise<OperatorDbPing> {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    return { status: "memory", label: "Memory (CI)" };
  }

  try {
    const sql = neon(url);
    await sql`SELECT 1`;
    return { status: "ok", label: "OK" };
  } catch {
    return { status: "down", label: "Down" };
  }
}

export async function loadOperatorStatus(
  env: NodeJS.ProcessEnv = process.env,
): Promise<OperatorStatus> {
  const [db, rows] = await Promise.all([
    pingDatabase(env),
    listWaitlistSignups(),
  ]);
  return {
    db,
    waitlistCount: rows.length,
  };
}

export function formatWaitlistCountLabel(count: number): string {
  if (count === 0) return "0 signups";
  return `${count} signup${count === 1 ? "" : "s"}`;
}
