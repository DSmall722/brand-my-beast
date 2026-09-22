import Link from "next/link";
import { PublicMark } from "@/components/PublicMark";
import type { AuctionLive as AuctionLiveModel } from "@/lib/auction-board";
import { formatUsd } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

export function AuctionLive({ model }: { model: AuctionLiveModel }) {
  const copy = PUBLIC_COPY.bidDesk;

  return (
    <div className="auction-live">
      <section
        className="auction-top"
        data-testid="auction-top"
        data-empty={model.top.length === 0 ? "true" : "false"}
        aria-labelledby="auction-top-title"
      >
        <h3 id="auction-top-title">{copy.topHeading}</h3>
        {model.top.length === 0 ? (
          <p className="auth-hint">{copy.topEmpty}</p>
        ) : (
          <ol className="auction-top-list">
            {model.top.map((mark, index) => (
              <li key={mark.bidId}>
                <span className="auction-rank">{index + 1}</span>
                <PublicMark
                  brandLabel={mark.brandLabel}
                  logoUrl={mark.publicLogoUrl}
                />
                <span className="auction-panel">{mark.panelName}</span>
                <span className="auction-amount">
                  {formatUsd(mark.standingUsd)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        className="auction-today"
        data-testid="auction-today"
        data-empty={model.today.length === 0 ? "true" : "false"}
        aria-labelledby="auction-today-title"
      >
        <h3 id="auction-today-title">{copy.todayHeading}</h3>
        {model.today.length === 0 ? (
          <p className="auth-hint">{copy.todayEmpty}</p>
        ) : (
          <ul className="auction-today-list">
            {model.today.map((mark) => (
              <li key={mark.bidId}>
                <time>{mark.timeLabel}</time>
                <PublicMark
                  brandLabel={mark.brandLabel}
                  logoUrl={mark.publicLogoUrl}
                />
                <span>{mark.panelName}</span>
                <span>{formatUsd(mark.standingUsd)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="auction-leaderboard-link">
          <Link href="/leaderboard" data-testid="leaderboard-link">
            {copy.leaderboardLink}
          </Link>
        </p>
      </section>
    </div>
  );
}
