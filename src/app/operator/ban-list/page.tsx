import Link from "next/link";
import { redirect } from "next/navigation";
import { BanListForm } from "@/components/BanListForm";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { listBanRules, readBanListLastRun } from "@/lib/operator-ban-list";

/**
 * Slice 8.8 — operator ban-list table. Auth + OPERATOR_EMAILS.
 */
export default async function OperatorBanListPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/operator/ban-list");
  }
  if (!isOperatorEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main
          id="main-content"
          className="shell auth-page"
          data-testid="operator-ban-list-denied"
        >
          <h1>Operator only</h1>
          <p className="section-lead">
            Ban list is limited to operator emails. Set{" "}
            <code>OPERATOR_EMAILS</code> in Vercel.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const rules = await listBanRules();
  const lastRun = readBanListLastRun();
  const lastRunLine = !lastRun
    ? "No ban-list run yet."
    : lastRun.blockedLabels.length === 0
      ? "Last run blocked no panels."
      : `Last run blocked ${lastRun.blockedLabels.join(", ")}.`;

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page"
        data-testid="operator-ban-list"
      >
        <p className="eyebrow">Operator</p>
        <h1>Ban list</h1>
        <p className="section-lead">
          Patterns hard-reject matching brand/trade on list. Floor{" "}
          {formatUsd(FLOOR_USD)}. Buyout {formatUsd(GOAL_USD)}. Additive to the
          static porn/hate/scam/school-lot rules.
        </p>
        <p className="auth-hint" data-testid="operator-ban-list-nav">
          <Link href="/operator" data-testid="operator-ban-approvals-link">
            Intent approvals
          </Link>
        </p>

        <BanListForm />

        <p className="auth-hint" data-testid="ban-last-run-stored">
          {lastRunLine}
        </p>

        <p className="approvals-count" data-testid="operator-ban-list-count">
          {rules.length === 0
            ? "No operator ban patterns yet"
            : `${rules.length} pattern${rules.length === 1 ? "" : "s"}`}
        </p>

        {rules.length === 0 ? (
          <div className="empty-state" data-testid="operator-ban-list-empty">
            <p>No operator bans yet. Static CAMPAIGN bans still apply.</p>
          </div>
        ) : (
          <ul className="intent-list" data-testid="operator-ban-list-rows">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="decided-row"
                data-testid={`operator-ban-row-${rule.id}`}
              >
                <div className="decided-row-main">
                  <strong data-testid="operator-ban-pattern">
                    {rule.pattern}
                  </strong>
                  {rule.note ? (
                    <span className="auth-hint" data-testid="operator-ban-note">
                      {rule.note}
                    </span>
                  ) : null}
                  <time
                    className="auth-hint"
                    dateTime={rule.createdAt}
                    data-testid="operator-ban-created"
                  >
                    {rule.createdAt}
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
