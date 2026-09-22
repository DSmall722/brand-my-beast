import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowFillButton } from "@/components/block/arrow-fill-button";
import { ImmortalEtchLockup } from "@/components/ImmortalEtchLockup";
import { IntentBidForm } from "@/components/IntentBidForm";
import { PanelMockup } from "@/components/PanelMockup";
import { TruckViewHotspots } from "@/components/TruckViewHotspots";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import {
  BRAND,
  FLOOR_USD,
  PANELS,
  TRUCK_EXISTS,
  currentBidUsd,
  formatIntegerUsd,
  formatUsd,
  isEtchable,
} from "@/lib/campaign";
import {
  failedWinnerOfferCopy,
  resolveFailedWinnerOfferForViewer,
} from "@/lib/failed-winner-offer";
import { intentStatusClass, intentStatusLabel } from "@/lib/intent-labels";
import {
  listBidsForPanel,
  loadBoardIntentStats,
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
  const board = await loadBoardIntentStats();
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
  const currentBid = currentBidUsd(panel.openingUsd, holder?.standingUsd);
  const showBidForm = seatsOpen && Boolean(session?.user);

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page panel-intent public-seat"
        data-testid="panel-intent-page"
        data-print-sheet="panels"
        data-standing-usd={standing}
        data-minimum-usd={minimum}
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
            Current Bid {formatUsd(currentBid)}.{" "}
            <span
              className="seat-finish"
              data-testid="seat-finish"
              data-etchable={etchable ? "true" : "false"}
            >
              {etchable ? (
                <ImmortalEtchLockup text={PUBLIC_COPY.panels.badgeEtch} />
              ) : (
                PUBLIC_COPY.panels.badgeWrap
              )}
            </span>
          </p>
          <span hidden data-testid="panel-standing">
            {formatUsd(standing)}
          </span>
          <span hidden data-testid="panel-minimum">
            {formatIntegerUsd(minimum)}
          </span>
          {holder ? (
            <p className="seat-holder-line" data-testid="seat-holder">
              <strong data-testid="public-standing-brand">
                {holder.brandLabel}
              </strong>
              {" · "}
              <span data-testid="public-standing-trade">
                {holder.tradeLabel}
              </span>
              {" · "}
              <span data-testid="public-standing-amount">
                {formatUsd(holder.standingUsd)}
              </span>
            </p>
          ) : null}
        </div>

        <div className="seat-stage" data-testid="seat-photo-stage">
          <TruckViewHotspots
            occupiedPanelIds={occupiedPanelIds}
            activePanelId={panel.id}
            compact
          />
        </div>

        <PanelMockup
          panel={panel}
          raisedUsd={board.pledgedUsd}
          truckExists={TRUCK_EXISTS}
        />

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

        {showBidForm ? (
          <section
            className="intent-compose"
            aria-labelledby="intent-compose-title"
          >
            <h2 id="intent-compose-title" className="auth-subhead">
              List an intent mark
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
          <div className="seat-cta" data-testid="seat-primary-cta">
            <ArrowFillButton
              href="/#waitlist"
              data-testid="public-seat-waitlist-cta"
            >
              {PUBLIC_COPY.hero.primaryCta}
            </ArrowFillButton>
          </div>
        )}

        {seatLog.length > 0 ? (
          <section
            className="public-seat-log"
            aria-labelledby="public-seat-log-title"
            data-testid="public-seat-log"
          >
            <h2 id="public-seat-log-title" className="auth-subhead">
              Bid Activity
            </h2>
            <ul className="intent-list" data-testid="intent-list">
              {bids.map((bid) => {
                const entry = seatLog.find((row) => row.bidId === bid.id);
                return (
                  <li
                    key={bid.id}
                    className="intent-row"
                    data-testid={`intent-row-${bid.id}`}
                    data-seat-log-row={bid.id}
                  >
                    <div
                      className="intent-row-main"
                      data-testid={`seat-log-row-${bid.id}`}
                    >
                      <strong
                        className="intent-brand"
                        data-testid={`intent-brand-${bid.id}`}
                      >
                        {bid.brandLabel}
                      </strong>
                      <span
                        className="intent-trade"
                        data-testid={`intent-trade-${bid.id}`}
                      >
                        {bid.tradeLabel}
                      </span>
                      <span
                        className="intent-mark"
                        data-testid={`intent-amount-${bid.id}`}
                      >
                        {formatUsd(bid.standingUsd)}
                      </span>
                    </div>
                    <div className="intent-row-meta">
                      <span className={intentStatusClass(bid.status)}>
                        {intentStatusLabel(bid.status)}
                      </span>
                      <time
                        className="auth-hint"
                        dateTime={bid.createdAt}
                        data-testid={`intent-time-${bid.id}`}
                      >
                        {formatSeatLogTime(bid.createdAt)}
                      </time>
                      {entry ? (
                        <>
                          <span
                            className="auth-hint"
                            data-testid={`seat-log-number-${bid.id}`}
                          >
                            {entry.panelNumberLabel}
                          </span>
                          <span
                            className="intent-mark"
                            data-testid={`seat-log-amount-${bid.id}`}
                          >
                            {entry.amountLabel}
                          </span>
                          <time
                            dateTime={entry.createdAt}
                            data-testid={`seat-log-time-${bid.id}`}
                          >
                            {entry.timeLabel}
                          </time>
                          <span
                            className="auth-hint"
                            data-testid={`seat-log-brand-${bid.id}`}
                          >
                            {entry.brandLabel}
                          </span>
                        </>
                      ) : null}
                      {bid.floorSaveUsd != null ? (
                        <span
                          className="auth-hint"
                          data-testid={`intent-floor-save-badge-${bid.id}`}
                        >
                          Floor-save to {formatUsd(bid.floorSaveUsd)} if short of{" "}
                          {formatUsd(FLOOR_USD)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
