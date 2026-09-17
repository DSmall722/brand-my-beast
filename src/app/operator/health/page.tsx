import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import {
  lastDrizzleMigrationName,
  lastDrizzleMigrationTag,
} from "@/lib/drizzle-migrations";
import {
  formatLastDigestLabel,
  formatPendingCountLabel,
  loadOperatorHealthSnapshot,
} from "@/lib/operator-health";
import { formatWaitlistCountLabel } from "@/lib/operator-status";

/**
 * Slice 12.42 — last Drizzle migration name.
 * Slice 13.45 — waitlist count + pending count + last digest time.
 */
export default async function OperatorHealthPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/operator/health");
  }
  if (!isOperatorEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main
          id="main-content"
          className="shell auth-page"
          data-testid="operator-health-denied"
        >
          <h1>Operator only</h1>
          <p className="section-lead">
            Health is limited to operator emails. Set{" "}
            <code>OPERATOR_EMAILS</code> in Vercel.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const health = await loadOperatorHealthSnapshot();
  const migrationName = lastDrizzleMigrationName();
  const migrationTag = lastDrizzleMigrationTag();

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page"
        data-testid="operator-health"
      >
        <p className="eyebrow">Operator</p>
        <h1>Health</h1>
        <p className="section-lead">
          Waitlist, pending queue, last digest, and last Drizzle migration.
          Floor {formatUsd(FLOOR_USD)}. Buyout {formatUsd(GOAL_USD)}.
        </p>
        <p className="auth-hint" data-testid="operator-health-nav">
          <Link href="/operator" data-testid="operator-health-approvals-link">
            Intent approvals
          </Link>
        </p>

        <dl className="auth-dl" data-testid="operator-health-dl">
          <div>
            <dt>DB ping</dt>
            <dd data-testid="operator-health-db">{health.db.label}</dd>
          </div>
          <div>
            <dt>Waitlist</dt>
            <dd data-testid="operator-health-waitlist-count">
              {formatWaitlistCountLabel(health.waitlistCount)}
            </dd>
          </div>
          <div>
            <dt>Pending intents</dt>
            <dd data-testid="operator-health-pending-count">
              {formatPendingCountLabel(health.pendingCount)}
            </dd>
          </div>
          <div>
            <dt>Last digest</dt>
            <dd data-testid="operator-health-last-digest">
              {formatLastDigestLabel(health.lastDigestAt)}
            </dd>
          </div>
          <div>
            <dt>Last migration file</dt>
            <dd data-testid="operator-health-migration-file">
              {migrationName ?? "none"}
            </dd>
          </div>
          <div>
            <dt>Last migration</dt>
            <dd data-testid="operator-health-migration">
              {migrationTag ?? "none"}
            </dd>
          </div>
        </dl>
      </main>
    </>
  );
}
