import Link from "next/link";
import { GOAL_USD, PANELS, formatUsd, isEtchable } from "@/lib/campaign";
import type { IntentBid } from "@/lib/intent";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { winnerPacketPath } from "@/lib/winner-packet";
import {
  winnerPortalFactsVisible,
  winnerSeatsFor,
} from "@/lib/winner-portal";

export function WinnerPortalSheet({
  wins,
}: {
  wins: readonly IntentBid[];
}) {
  const facts = winnerPortalFactsVisible();
  /** Slice 12.21 — defense in depth: approved standing seats only. */
  const approvedOnly = winnerSeatsFor(wins);

  return (
    <div className="winner-portal-sheet" data-testid="winner-portal-sheet">
      <section
        className="winner-portal-facts"
        aria-labelledby="winner-portal-facts-title"
        data-testid="winner-portal-facts"
      >
        <h2 id="winner-portal-facts-title" className="auth-subhead">
          What this seat is
        </h2>
        <ul className="winner-portal-facts-list">
          {facts.map((fact) => (
            <li key={fact.id} data-testid={`winner-fact-${fact.id}`}>
              {fact.text}
            </li>
          ))}
        </ul>
      </section>

      <section
        className="winner-portal-seats"
        aria-labelledby="winner-portal-seats-title"
        data-testid="winner-portal-seats"
      >
        <h2 id="winner-portal-seats-title" className="auth-subhead">
          Approved wrap seats
        </h2>
        {approvedOnly.length === 0 ? (
          <p className="empty-state" data-testid="winner-portal-empty">
            {PUBLIC_COPY.seat.winsEmpty}
          </p>
        ) : (
          <ul
            className="intent-list winner-portal-seats-list"
            data-testid="winner-portal-seats-list"
            data-approved-only="true"
          >
            {approvedOnly.map((bid) => {
              const panel = PANELS.find((row) => row.id === bid.panelId);
              return (
                <li
                  key={bid.id}
                  className="intent-row"
                  data-testid={`winner-seat-${bid.id}`}
                  data-status={bid.status}
                  data-user-id={bid.userId}
                >
                  <div className="intent-row-main">
                    <strong>
                      <Link href={`/panels/${bid.panelId}`}>
                        {panel?.name ?? bid.panelId}
                      </Link>
                      {" · "}
                      {bid.brandLabel}
                      {" · "}
                      {bid.tradeLabel}
                    </strong>
                    <span className="intent-mark">
                      {formatUsd(bid.standingUsd)}
                    </span>
                  </div>
                  <p className="auth-hint">
                    {panel && isEtchable(panel)
                      ? `Approved wrap · etchable at ${formatUsd(GOAL_USD)}`
                      : "Approved wrap only"}
                  </p>
                  <p className="auth-hint">
                    <a
                      href={winnerPacketPath(bid.id)}
                      data-testid={`winner-packet-${bid.id}`}
                    >
                      Download winner packet
                    </a>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
