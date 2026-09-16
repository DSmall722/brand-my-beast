import Link from "next/link";
import { redirect } from "next/navigation";
import { WaitlistDomainBlockForm } from "@/components/WaitlistDomainBlockForm";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { listDomainBlocks } from "@/lib/waitlist-domain-blocklist";

/**
 * Slice 13.31 — operator waitlist domain blocklist. Auth + OPERATOR_EMAILS.
 */
export default async function OperatorWaitlistDomainsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/operator/waitlist-domains");
  }
  if (!isOperatorEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main
          id="main-content"
          className="shell auth-page"
          data-testid="operator-waitlist-domains-denied"
        >
          <h1>Operator only</h1>
          <p className="section-lead">
            Waitlist domain blocklist is limited to operator emails. Set{" "}
            <code>OPERATOR_EMAILS</code> in Vercel.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const rules = await listDomainBlocks();

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page"
        data-testid="operator-waitlist-domains"
      >
        <p className="eyebrow">Operator</p>
        <h1>Waitlist domains</h1>
        <p className="section-lead">
          Block disposable email domains from the waitlist. Floor{" "}
          {formatUsd(FLOOR_USD)}. Buyout {formatUsd(GOAL_USD)}. Still no card
          charge. Built-in disposables stay blocked; add more below.
        </p>
        <p className="auth-hint" data-testid="operator-waitlist-domains-nav">
          <Link href="/operator" data-testid="operator-domains-approvals-link">
            Intent approvals
          </Link>
          {" · "}
          <Link
            href="/operator/waitlist"
            data-testid="operator-domains-waitlist-link"
          >
            Waitlist signups
          </Link>
        </p>

        <WaitlistDomainBlockForm />

        <p
          className="approvals-count"
          data-testid="operator-waitlist-domains-count"
        >
          {rules.length === 0
            ? "No blocked domains yet"
            : `${rules.length} domain${rules.length === 1 ? "" : "s"}`}
        </p>

        {rules.length === 0 ? (
          <div
            className="empty-state"
            data-testid="operator-waitlist-domains-empty"
          >
            <p>No domains on the blocklist yet.</p>
          </div>
        ) : (
          <ul
            className="intent-list"
            data-testid="operator-waitlist-domains-rows"
          >
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="decided-row"
                data-testid={`operator-waitlist-domain-row-${rule.id}`}
                data-source={rule.source}
              >
                <div className="decided-row-main">
                  <strong data-testid="operator-waitlist-domain">
                    {rule.domain}
                  </strong>
                  {rule.note ? (
                    <span
                      className="auth-hint"
                      data-testid="operator-waitlist-domain-note"
                    >
                      {rule.note}
                    </span>
                  ) : null}
                  <time
                    className="auth-hint"
                    dateTime={rule.createdAt}
                    data-testid="operator-waitlist-domain-created"
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
