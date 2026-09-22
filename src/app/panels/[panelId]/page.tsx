import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayByDay } from "@/components/home/DayByDay";
import { ImmortalEtchLockup } from "@/components/ImmortalEtchLockup";
import { IntentArtworkPreview } from "@/components/IntentArtworkPreview";
import { IntentBidForm } from "@/components/IntentBidForm";
import { TruckViewHotspots } from "@/components/TruckViewHotspots";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { buildDayByDay } from "@/lib/bid-desk";
import {
  BRAND,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatIntegerUsd,
  formatUsd,
  isEtchable,
} from "@/lib/campaign";
import { depositUsdForMark, minIncrementUsd } from "@/lib/intent";
import {
  failedWinnerOfferCopy,
  resolveFailedWinnerOfferForViewer,
} from "@/lib/failed-winner-offer";
import { intentStatusClass, intentStatusLabel } from "@/lib/intent-labels";
import {
  listBidsForPanel,
  loadStandingHoldersByPanel,
  minimumIntentUsd,
  standingForPanel,
} from "@/lib/intent-store";
import { listBanRules } from "@/lib/operator-ban-list";
import { panelBoardMarkFor, panelSeatH1 } from "@/lib/panel-board";
import { panelOpenGraphTitle } from "@/lib/panel-open-graph";
import { PUBLIC_COPY } from "@/lib/public-copy";
import {
  holdersOnAdjacentPanels,
  type AdjacentSeatHolder,
} from "@/lib/panel-clash";
import { buildPublicSeatLog, formatSeatLogTime } from "@/lib/seat-log";
import { resolveSeatsOpen } from "@/lib/seats-open";

type Params = Promise<{ panelId: string }>;

/**
 * Slice 14.16 — per-panel Open Graph title `{Panel} — BrandMyBeast`.
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { panelId } = await params;
  const panel = PANELS.find((row) => row.id === panelId);
  if (!panel) {
    return { title: BRAND.name };
  }
  const title = panelOpenGraphTitle(panel);
  return {
    title,
    openGraph: {
      title,
      siteName: BRAND.name,
      type: "website",
    },
    twitter: {
      title,
    },
  };
}

export default async function PanelIntentPage({
  params,
}: {
  params: Params;
}) {
  const { panelId } = await params;
  const panel = PANELS.find((row) => row.id === panelId);
  if (!panel) notFound();

  const boardMark = panelBoardMarkFor(panel.id);
  const session = await auth();
  const standing = await standingForPanel(panel.id);
  const minimum = await minimumIntentUsd(panel.id);
  const bids = await listBidsForPanel(panel.id);
  const seatsOpen = resolveSeatsOpen();
  const holdersRaw = await loadStandingHoldersByPanel();
  const holdersByPanel = new Map<string, AdjacentSeatHolder | null>();
  for (const row of PANELS) {
    const held = holdersRaw.get(row.id);
    holdersByPanel.set(
      row.id,
      held
        ? {
            panelId: row.id,
            panelName: row.name,
            brandLabel: held.brandLabel,
            tradeLabel: held.tradeLabel,
          }
        : null,
    );
  }
  const adjacentNeighbors = holdersOnAdjacentPanels(panel.id, holdersByPanel);
  const occupiedPanelIds = [...holdersRaw.keys()];
  const etchable = isEtchable(panel);
  const viewerId = session?.user?.id;
  // Slice 9.6 / 13.11 — live offer only inside TTL; else next compliant / expired.
  // Slice 14.26 — banned trades (static + operator list) never get the offer.
  const operatorBanRules = await listBanRules();
  const failedWinner = resolveFailedWinnerOfferForViewer({
    bids,
    viewerId,
    panelMinimumUsd: minimum,
    operatorBanRules,
  });
  const viewerOutbid = failedWinner.viewerOutbid;
  const viewerWasOutbid = Boolean(viewerOutbid);
  const failedWinnerOffer = failedWinner.offer;
  const failedWinnerExpired = failedWinner.expiredForViewer;
  const holder = bids.find(
    (bid) => bid.status === "listed" || bid.status === "approved",
  );
  const seatLog = buildPublicSeatLog(bids);
  const dayByDay = buildDayByDay(bids, { panelId: panel.id });

  const seatOpen = !holder;
  // Slice 9.2 — next minimum is standing + max($250, 10%) once a mark holds.
  const incrementUsd = seatOpen ? 0 : minIncrementUsd(standing);

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page panel-intent public-seat"
        data-testid="panel-intent-page"
        data-print-sheet="panels"
        data-floor={formatUsd(FLOOR_USD)}
        data-buyout={formatUsd(GOAL_USD)}
      >
        <div className="seat-masthead">
        <p className="eyebrow">
          <Link href="/#panels">Panels</Link>
        </p>
        <h1 data-testid="panel-seat-h1" data-panel-n={String(boardMark.n)}>
          {panelSeatH1(panel)}
        </h1>
        <p
          className="section-lead"
          data-testid="seat-lead"
          data-has-standing={holder ? "true" : "false"}
        >
          <span
            className="seat-finish"
            data-testid="seat-finish"
            data-etchable={etchable ? "true" : "false"}
          >
            {etchable ? (
              <>
                <span data-testid="seat-wrap-line">
                  {PUBLIC_COPY.seat.wrapTwelveMonths}
                </span>{" "}
                <ImmortalEtchLockup text={PUBLIC_COPY.panels.badgeEtch} />
              </>
            ) : (
              <span data-testid="seat-wrap-line">
                {PUBLIC_COPY.seat.bumperWrapOnly}
              </span>
            )}
          </span>
        </p>
        </div>

        <div className="seat-stage" data-testid="seat-photo-stage">
        <TruckViewHotspots
          occupiedPanelIds={occupiedPanelIds}
          activePanelId={panel.id}
          compact
        />
        </div>

        <dl
          className="panel-stats"
          data-testid="panel-stats"
          data-seat-open={seatOpen ? "true" : "false"}
          data-standing-usd={standing}
          data-minimum-usd={minimum}
          data-increment-usd={incrementUsd}
        >
          <div>
            <dt>Opening</dt>
            <dd>{formatUsd(panel.openingUsd)}</dd>
          </div>
          <div>
            <dt>Standing</dt>
            <dd data-testid="panel-standing">{formatUsd(standing)}</dd>
          </div>
          <div>
            <dt>Min next</dt>
            <dd data-testid="panel-minimum">{formatIntegerUsd(minimum)}</dd>
          </div>
          <div>
            <dt>Increment</dt>
            <dd data-testid="panel-increment">
              {seatOpen ? "—" : formatIntegerUsd(incrementUsd)}
            </dd>
          </div>
          <div>
            <dt>Deposit shown</dt>
            <dd data-testid="panel-deposit-shown">
              {DEPOSIT_PERCENT}% · {formatUsd(depositUsdForMark(standing))}
            </dd>
          </div>
        </dl>

        {viewerWasOutbid && failedWinnerOffer ? (
          <aside
            className="failed-winner-banner"
            data-testid="failed-winner-offer"
            data-last-mark={failedWinnerOffer.lastMarkUsd}
            data-offer={failedWinnerOffer.offerUsd}
            data-expires-at={failedWinnerOffer.expiresAt}
          >
            <p data-testid="failed-winner-offer-copy">
              {failedWinnerOfferCopy(failedWinnerOffer)}
            </p>
            <p data-testid="failed-winner-offer-amount">
              Offer mark {formatUsd(failedWinnerOffer.offerUsd)}
            </p>
            <p data-testid="failed-winner-waitlist">
              {PUBLIC_COPY.seat.failedWinnerWaitlist}{" "}
              <Link href="/#waitlist">Waitlist</Link> — submit below to accept
              the offer. No silent reopen.
            </p>
          </aside>
        ) : null}

        {viewerWasOutbid && failedWinnerExpired && !failedWinnerOffer ? (
          <aside
            className="failed-winner-banner"
            data-testid="failed-winner-offer-expired"
          >
            <p data-testid="failed-winner-expired-copy">
              {PUBLIC_COPY.seat.failedWinnerExpired}
            </p>
            <p data-testid="failed-winner-waitlist">
              {PUBLIC_COPY.seat.failedWinnerWaitlist}{" "}
              <Link href="/#waitlist">Waitlist</Link>
            </p>
          </aside>
        ) : null}

        {seatsOpen && session?.user ? (
          <section
            className="intent-compose seat-primary"
            aria-labelledby="intent-compose-title"
            data-testid="seat-primary-cta"
            data-cta="bid"
          >
            <h2 id="intent-compose-title" className="auth-subhead">
              Bid
            </h2>
            <IntentBidForm
              panelId={panel.id}
              minimumUsd={minimum}
              adjacentNeighbors={adjacentNeighbors}
              suggestedStandingUsd={failedWinnerOffer?.offerUsd}
              suggestedBrand={viewerOutbid?.brandLabel ?? ""}
              suggestedTrade={viewerOutbid?.tradeLabel ?? ""}
              seatsOpen={seatsOpen}
            />
          </section>
        ) : (
          <p className="seat-primary">
            <Link
              className="btn btn-signal"
              href={
                seatsOpen
                  ? `/signin?callbackUrl=/panels/${panel.id}`
                  : "/#waitlist"
              }
              data-testid="seat-primary-cta"
              data-cta={seatsOpen ? "bid" : "contact"}
            >
              {seatsOpen ? "Bid" : "Contact BMB"}
            </Link>
          </p>
        )}

        <DayByDay model={dayByDay} showPanel={false} />

        {seatLog.length === 0 ? null : (
        <section
          className="public-seat-log"
          aria-labelledby="bid-activity-title"
          data-testid="public-seat-log"
        >
          <h2 id="bid-activity-title" className="auth-subhead">
            Bid Activity
          </h2>
          <p className="auth-hint" data-testid="public-seat-log-lead">
            Public marks on this seat: panel number, amount, and time (ET). No
            bidder email.
          </p>
          <div data-testid="intent-list">
            <ol className="seat-log-list" data-testid="public-seat-log-list">
              {seatLog.map((entry) => {
                const bid = bids.find((row) => row.id === entry.bidId);
                if (!bid) return null;
                const standingRow = holder?.id === bid.id;
                return (
                  <li
                    key={entry.bidId}
                    className="seat-log-row intent-row"
                    data-testid={`seat-log-row-${entry.bidId}`}
                  >
                    <span
                      className="auth-hint"
                      data-testid={`seat-log-number-${entry.bidId}`}
                    >
                      {entry.panelNumberLabel}
                    </span>
                    <strong
                      className="intent-brand"
                      data-testid={`intent-brand-${bid.id}`}
                    >
                      {bid.brandLabel}
                    </strong>
                    <span className="seat-mirror" data-testid={`seat-log-brand-${entry.bidId}`}>
                      {entry.brandLabel}
                    </span>
                    <span
                      className="intent-trade"
                      data-testid={`intent-trade-${bid.id}`}
                    >
                      {bid.tradeLabel}
                    </span>
                    <span
                      className="intent-mark"
                      data-testid={`seat-log-amount-${entry.bidId}`}
                    >
                      {entry.amountLabel}
                    </span>
                    <span className="seat-mirror" data-testid={`intent-amount-${bid.id}`}>
                      {formatUsd(bid.standingUsd)}
                    </span>
                    <time
                      dateTime={entry.createdAt}
                      data-testid={`seat-log-time-${entry.bidId}`}
                    >
                      {entry.timeLabel}
                    </time>
                    <time
                      className="seat-mirror"
                      dateTime={bid.createdAt}
                      data-testid={`intent-time-${bid.id}`}
                    >
                      {formatSeatLogTime(bid.createdAt)}
                    </time>
                    <span className={intentStatusClass(bid.status)}>
                      {intentStatusLabel(bid.status)}
                    </span>
                    {standingRow ? (
                      <>
                        <span className="seat-mirror" data-testid="public-standing-brand">
                          {bid.brandLabel}
                        </span>
                        <span className="seat-mirror" data-testid="public-standing-trade">
                          {bid.tradeLabel}
                        </span>
                        <span className="seat-mirror" data-testid="public-standing-amount">
                          {formatUsd(bid.standingUsd)}
                        </span>
                      </>
                    ) : null}
                    {bid.floorSaveUsd != null ? (
                      <span
                        className="auth-hint"
                        data-testid={`intent-floor-save-badge-${bid.id}`}
                      >
                        Floor-save to {formatUsd(bid.floorSaveUsd)} if short of{" "}
                        {formatUsd(FLOOR_USD)} (not charged)
                      </span>
                    ) : null}
                    <IntentArtworkPreview
                      artworkUrl={bid.artworkUrl}
                      bidId={bid.id}
                    />
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
        )}
      </main>
    </>
  );
}
