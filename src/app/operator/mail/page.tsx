import Link from "next/link";
import { redirect } from "next/navigation";
import { RetryMailDeadLetterButton } from "@/components/RetryMailDeadLetterButton";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { listMailDeadLetters } from "@/lib/mail-dead-letter";

/**
 * Slice 12.12 — failed Resend dead-letters; operator can retry.
 */
export default async function OperatorMailDeadLetterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/operator/mail");
  }
  if (!isOperatorEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main
          id="main-content"
          className="shell auth-page"
          data-testid="operator-mail-denied"
        >
          <h1>Operator only</h1>
          <p className="section-lead">
            Mail dead-letter is limited to operator emails. Set{" "}
            <code>OPERATOR_EMAILS</code> in Vercel.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const rows = await listMailDeadLetters();

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page"
        data-testid="operator-mail-page"
      >
        <p className="auth-hint">
          Floor {formatUsd(FLOOR_USD)} · Buyout {formatUsd(GOAL_USD)} · CLOSE_AT
          null
        </p>
        <h1>Mail dead-letter</h1>
        <p className="section-lead">
          Failed Resend sends land here. Retry re-sends the same payload. Intent
          only — no card charge.
        </p>
        <p>
          <Link href="/operator" data-testid="operator-mail-approvals-link">
            Back to approvals
          </Link>
        </p>

        {rows.length === 0 ? (
          <p data-testid="mail-dead-letter-empty">No failed sends queued.</p>
        ) : (
          <ul className="auth-list" data-testid="mail-dead-letter-list">
            {rows.map((row) => (
              <li
                key={row.id}
                data-testid={`mail-dead-letter-row-${row.id}`}
                data-status={row.status}
              >
                <strong>{row.kind}</strong> → {row.toAddress}
                <br />
                <span className="auth-hint">{row.subject}</span>
                <br />
                <span className="auth-hint">Status: {row.status}</span>
                <br />
                <span className="auth-error">{row.error}</span>
                {row.status === "pending" ? (
                  <RetryMailDeadLetterButton deadLetterId={row.id} />
                ) : (
                  <p className="auth-hint">
                    Retried {row.retriedAt ?? "—"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
