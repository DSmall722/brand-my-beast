import { neon } from "@neondatabase/serverless";
import { listWaitlistSignups } from "@/lib/waitlist";

/**
 * Slice 11.5 — operator-only status (DB ping + waitlist count).
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
