import type { Metadata } from "next";
import Link from "next/link";
import { PublicMark } from "@/components/PublicMark";
import { SiteChrome } from "@/components/SiteChrome";
import { buildLeaderboard } from "@/lib/auction-board";
import { BRAND, PANELS, formatUsd } from "@/lib/campaign";
import { listBidsForPanel } from "@/lib/intent-store";
import { PUBLIC_COPY } from "@/lib/public-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${PUBLIC_COPY.bidDesk.leaderboardHeading} — ${BRAND.name}`,
};

export default async function LeaderboardPage() {
  const bids = (
    await Promise.all(PANELS.map((panel) => listBidsForPanel(panel.id)))
  ).flat();
  const board = buildLeaderboard(bids);
  const copy = PUBLIC_COPY.bidDesk;
  const empty = board.rows.length === 0;
  const podium = board.rows.slice(0, 3);
  const rest = board.rows.slice(3);
  const bidWord = board.bidCount === 1 ? "bid" : "bids";
  const brandWord = board.brandCount === 1 ? "brand" : "brands";

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell section leaderboard"
        data-testid="leaderboard-page"
        data-empty={empty ? "true" : "false"}
      >
        <p className="eyebrow">
          <Link href="/#money">Track the Auction</Link>
        </p>
        <h1>{copy.leaderboardHeading}</h1>
        {empty ? (
          <p className="section-lead" data-testid="leaderboard-empty">
            {copy.leaderboardEmpty}
          </p>
        ) : (
          <>
            <p className="section-lead" data-testid="leaderboard-count">
              {board.bidCount} {bidWord} from {board.brandCount} {brandWord}.{" "}
              {copy.leaderboardStay}
            </p>
            <p className="auth-hint">{copy.leaderboardEvery}</p>
            <ol className="leaderboard-podium" data-testid="leaderboard-podium">
              {podium.map((row) => (
                <li key={row.bidId} data-testid={`leaderboard-row-${row.rank}`}>
                  <span className="auction-rank">{row.rank}</span>
                  <PublicMark
                    brandLabel={row.brandLabel}
                    logoUrl={row.publicLogoUrl}
                  />
                  <span>
                    {row.panelName} · {row.dayLabel}
                  </span>
                  <span className="auction-amount">{formatUsd(row.standingUsd)}</span>
                </li>
              ))}
            </ol>
            {rest.length > 0 ? (
              <>
                <h2 className="auth-subhead">{copy.leaderboardRest}</h2>
                <ol className="leaderboard-rest" start={4}>
                  {rest.map((row) => (
                    <li key={row.bidId} data-testid={`leaderboard-row-${row.rank}`}>
                      <span className="auction-rank">{row.rank}</span>
                      <PublicMark
                        brandLabel={row.brandLabel}
                        logoUrl={row.publicLogoUrl}
                      />
                      <span>
                        {row.panelName} · {row.dayLabel}
                      </span>
                      <span>{formatUsd(row.standingUsd)}</span>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
