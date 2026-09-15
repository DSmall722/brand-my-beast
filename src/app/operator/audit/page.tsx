import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { listOperatorAuditLog } from "@/lib/operator-audit-log";

/**
 * Slice 8.9 — operator audit log (who / when / note id on approve|reject).
 */
export default async function OperatorAuditPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/operator/audit");
  }
  if (!isOperatorEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main
          id="main-content"
          className="shell auth-page"
          data-testid="operator-audit-denied"
        >
          <h1>Operator only</h1>
          <p className="section-lead">
            Audit log is limited to operator emails. Set{" "}
            <code>OPERATOR_EMAILS</code> in Vercel.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const rows = await listOperatorAuditLog();

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page"
        data-testid="operator-audit"
      >
        <p className="eyebrow">Operator</p>
        <h1>Audit log</h1>
        <p className="section-lead">
          Approve / reject rows with actor, time, and note id. Floor{" "}
          {formatUsd(FLOOR_USD)}. Buyout {formatUsd(GOAL_USD)}.
        </p>
        <p className="auth-hint" data-testid="operator-audit-nav">
          <Link href="/operator" data-testid="operator-audit-approvals-link">
            Intent approvals
          </Link>
        </p>

        <p className="approvals-count" data-testid="operator-audit-count">
          {rows.length === 0
            ? "No audit rows yet"
            : `${rows.length} row${rows.length === 1 ? "" : "s"}`}
        </p>

        {rows.length === 0 ? (
          <div className="empty-state" data-testid="operator-audit-empty">
            <p>Approve or reject an intent to write the first audit row.</p>
          </div>
        ) : (
          <ul className="intent-list" data-testid="operator-audit-list">
            {rows.map((row) => (
              <li
                key={row.id}
                className="decided-row"
                data-testid={`operator-audit-row-${row.id}`}
              >
                <div className="decided-row-main">
                  <strong data-testid="operator-audit-decision">
                    {row.decision}
                  </strong>
                  <span className="auth-hint" data-testid="operator-audit-who">
                    {row.actorEmail}
                  </span>
                  <span className="auth-hint" data-testid="operator-audit-bid">
                    bid {row.bidId}
                  </span>
                  <span
                    className="auth-hint"
                    data-testid="operator-audit-note-id"
                  >
                    note {row.noteId ?? "(none)"}
                  </span>
                  <time
                    className="auth-hint"
                    dateTime={row.createdAt}
                    data-testid="operator-audit-when"
                  >
                    {row.createdAt}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="auth-back">
          <Link href="/operator">Back to approvals</Link>
        </p>
      </main>
    </>
  );
}
