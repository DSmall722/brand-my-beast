import { neon } from "@neondatabase/serverless";
import { listWaitlistSignups } from "@/lib/waitlist";

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

export function getLastOperatorDigestAt(): string | null {
  return globalStore.__bmbLastOperatorDigestAt ?? null;
}

export function recordOperatorDigestSentAt(iso: string): void {
  globalStore.__bmbLastOperatorDigestAt = iso;
}

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
