import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { OPERATOR_CSV_PATH } from "@/lib/operator-csv";
import { listWaitlistSignups } from "@/lib/waitlist";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function wholeTruckFilter(
  raw: string | string[] | undefined,
): "all" | "yes" | "no" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "yes" || value === "no") return value;
  return "all";
}

/**
 * Slice 7.5 — operator-only waitlist roster.
 * Slice 16.0f — Whole-truck column + optional filter. No public header link.
 */
export default async function OperatorWaitlistPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/operator/waitlist");
  }
  if (!isOperatorEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main
          id="main-content"
          className="shell auth-page"
          data-testid="operator-waitlist-denied"
        >
          <h1>Operator only</h1>
          <p className="section-lead">
            Waitlist roster is limited to operator emails. Set{" "}
            <code>OPERATOR_EMAILS</code> in Vercel.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const params = await searchParams;
  const filter = wholeTruckFilter(params.wholeTruck);
  const allRows = await listWaitlistSignups();
  const rows =
    filter === "all"
      ? allRows
      : allRows.filter((row) =>
          filter === "yes" ? row.wantWholeTruck : !row.wantWholeTruck,
        );

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page"
        data-testid="operator-waitlist"
        data-whole-truck-filter={filter}
      >
        <p className="eyebrow">Operator</p>
        <h1>Waitlist signups</h1>
        <p className="section-lead">
          Emails that asked to be notified. Floor {formatUsd(FLOOR_USD)}. Buyout{" "}
          {formatUsd(GOAL_USD)}. Read-only roster — no off-site blast from this
          page.
        </p>

        <p className="auth-hint" data-testid="operator-waitlist-nav">
          <Link href="/operator" data-testid="operator-waitlist-approvals-link">
            Intent approvals
          </Link>
          {" · "}
          <a
            href={OPERATOR_CSV_PATH}
            data-testid="operator-csv-download"
          >
            Download CSV
          </a>
        </p>

        <p
          className="auth-hint"
          data-testid="operator-waitlist-whole-truck-filter"
        >
          Whole-truck:{" "}
          <Link
            href="/operator/waitlist"
            data-testid="operator-waitlist-filter-all"
            aria-current={filter === "all" ? "page" : undefined}
          >
            All
          </Link>
          {" · "}
          <Link
            href="/operator/waitlist?wholeTruck=yes"
            data-testid="operator-waitlist-filter-yes"
            aria-current={filter === "yes" ? "page" : undefined}
          >
            Yes
          </Link>
          {" · "}
          <Link
            href="/operator/waitlist?wholeTruck=no"
            data-testid="operator-waitlist-filter-no"
            aria-current={filter === "no" ? "page" : undefined}
          >
            No
          </Link>
        </p>

        <p
          className="approvals-count"
          data-testid="operator-waitlist-count"
        >
          {rows.length === 0
            ? "No signups yet"
            : `${rows.length} signup${rows.length === 1 ? "" : "s"}`}
        </p>

        {rows.length === 0 ? (
          <div className="empty-state" data-testid="operator-waitlist-empty">
            <p>No waitlist emails yet.</p>
            <p className="auth-hint">
              Public join lives on the homepage form. This page only lists them.
            </p>
          </div>
        ) : (
          <ul
            className="intent-list"
            data-testid="operator-waitlist-list"
          >
            {rows.map((row) => (
              <li
                key={row.email}
                className="decided-row"
                data-testid={`operator-waitlist-row-${row.email}`}
                data-want-whole-truck={row.wantWholeTruck ? "true" : "false"}
              >
                <div className="decided-row-main">
                  <strong data-testid="operator-waitlist-email">
                    {row.email}
                  </strong>
                  <span className="auth-hint" data-testid="operator-waitlist-source">
                    {row.source}
                  </span>
                  <span
                    className="auth-hint"
                    data-testid="operator-waitlist-whole-truck"
                  >
                    Whole-truck: {row.wantWholeTruck ? "Yes" : "No"}
                  </span>
                  <time
                    className="auth-hint"
                    dateTime={row.createdAt}
                    data-testid="operator-waitlist-created"
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
