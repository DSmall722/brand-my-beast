import { Resend } from "resend";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  shortfallToFloorUsd,
  shortfallToGoalUsd,
} from "@/lib/campaign";
import { operatorDigestEmailTemplate } from "@/emails/operator-digest";
import {
  listBidsPendingApproval,
  loadBoardIntentStats,
} from "@/lib/intent-store";
import { appendMailDeadLetter } from "@/lib/mail-dead-letter";
import { outboundMailEnvelope } from "@/lib/mail-envelope";
import { recordOperatorDigestSentAt } from "@/lib/operator-status";
import { listWaitlistSignups } from "@/lib/waitlist";

/** Payload Resend (or a test double) receives for the operator digest. */
export type OperatorDigestMailPayload = {
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  text: string;
};

export type OperatorDigestMailer = {
  send: (payload: OperatorDigestMailPayload) => Promise<unknown>;
};

export type OperatorDigest = {
  pendingCount: number;
  waitlistCount: number;
  pledgedUsd: number;
  shortfallFloorUsd: number;
  shortfallGoalUsd: number;
  seatedPanels: number;
  openSeats: number;
  floorUsd: number;
  goalUsd: number;
  closeAt: string | null;
  generatedAt: string;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbOperatorDigestMailer?: OperatorDigestMailer | null;
};

/**
 * Slice 8.2 — inject a Resend double in Playwright. Pass null to clear.
 * Live mail is never sent from the agent / CI.
 */
export function setOperatorDigestMailerForTests(
  mailer: OperatorDigestMailer | null,
): void {
  globalStore.__bmbOperatorDigestMailer = mailer;
}

export function resetOperatorDigestMailerForTests(): void {
  globalStore.__bmbOperatorDigestMailer = null;
}

function resolveMailer(
  apiKey: string | undefined,
): OperatorDigestMailer | null {
  if (globalStore.__bmbOperatorDigestMailer) {
    return globalStore.__bmbOperatorDigestMailer;
  }
  if (!apiKey) return null;
  const resend = new Resend(apiKey);
  return {
    send: (payload) => resend.emails.send(payload),
  };
}

/** Snapshot for the operator digest email / cron JSON. */
export async function buildOperatorDigest(): Promise<OperatorDigest> {
  const [pending, waitlist, board] = await Promise.all([
    listBidsPendingApproval(),
    listWaitlistSignups(),
    loadBoardIntentStats(),
  ]);

  return {
    pendingCount: pending.length,
    waitlistCount: waitlist.length,
    pledgedUsd: board.pledgedUsd,
    shortfallFloorUsd: shortfallToFloorUsd(board.pledgedUsd),
    shortfallGoalUsd: shortfallToGoalUsd(board.pledgedUsd),
    seatedPanels: board.seatedPanels,
    openSeats: board.openSeats,
    floorUsd: FLOOR_USD,
    goalUsd: GOAL_USD,
    closeAt: CLOSE_AT,
    generatedAt: new Date().toISOString(),
  };
}

export function formatOperatorDigestText(digest: OperatorDigest): string {
  return operatorDigestEmailTemplate(digest).text;
}

export function operatorDigestRecipients(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const fromAllow = (env.OPERATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.includes("@"));
  if (fromAllow.length > 0) return [...new Set(fromAllow)];
  return [BRAND.email];
}

/**
 * Slice 8.2 — send digest to operator inbox(es). Missing key/mailer = skipped.
 * Throws only for the caller to decide; cron route catches.
 */
export async function sendOperatorDigest(
  digest?: OperatorDigest,
): Promise<{ sent: number; skipped: boolean; digest: OperatorDigest }> {
  const snapshot = digest ?? (await buildOperatorDigest());
  const key = process.env.RESEND_API_KEY;
  const mailer = resolveMailer(key);
  if (!mailer) {
    // Still stamp the clock so /operator/health shows last digest attempt.
    recordOperatorDigestSentAt(snapshot.generatedAt);
    return { sent: 0, skipped: true, digest: snapshot };
  }

  const recipients = operatorDigestRecipients();
  const mail = operatorDigestEmailTemplate(snapshot);
  const { from, replyTo } = outboundMailEnvelope();

  let sent = 0;
  for (const to of recipients) {
    const payload = {
      from,
      replyTo,
      to,
      subject: mail.subject,
      text: mail.text,
    };
    try {
      await mailer.send(payload);
      sent += 1;
    } catch (error) {
      try {
        await appendMailDeadLetter({
          kind: "operator-digest",
          ...payload,
          error,
        });
      } catch {
        // Dead-letter write is best-effort.
      }
    }
  }
  recordOperatorDigestSentAt(snapshot.generatedAt);
  return { sent, skipped: false, digest: snapshot };
}

/** Vercel cron auth — Bearer CRON_SECRET. Unset secret = deny. */
export function isAuthorizedCronRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return Boolean(match && match[1] === secret);
}
