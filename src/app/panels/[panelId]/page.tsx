import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdjacentNeighborsCard,
} from "@/components/AdjacentClashHint";
import { HometownLaneTags } from "@/components/HometownLaneTags";
import { IntentArtworkPreview } from "@/components/IntentArtworkPreview";
import { IntentBidForm } from "@/components/IntentBidForm";
import { NeighborComboCard } from "@/components/NeighborComboCard";
import { PanelMockup } from "@/components/PanelMockup";
import { TruckViewHotspots } from "@/components/TruckViewHotspots";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import {
  BRAND,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
} from "@/lib/campaign";
import { OPENING_BID_RATIONALE } from "@/lib/opening-bid-rationale";
import { comboLotFor } from "@/lib/combo-lots";
import { depositUsdForMark, minIncrementUsd } from "@/lib/intent";
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
import { panelExtendedUntilCopy } from "@/lib/panel-extension";
import { panelOpenGraphTitle } from "@/lib/panel-open-graph";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { getPanelExtendedUntil } from "@/lib/panel-extension-store";
import {
  holdersOnAdjacentPanels,
  type AdjacentSeatHolder,
} from "@/lib/panel-clash";
import { buildPublicSeatLog, formatSeatLogTime } from "@/lib/seat-log";
import { seatExportPngPath } from "@/lib/seat-export-png";
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

  const session = await auth();
  const standing = await standingForPanel(panel.id);
  const minimum = await minimumIntentUsd(panel.id);
  const bids = await listBidsForPanel(panel.id);
  const board = await loadBoardIntentStats();
  const panelExtendedUntil = await getPanelExtendedUntil(panel.id);
  const extensionCopy = panelExtendedUntilCopy(panelExtendedUntil);
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
      >
        <p className="eyebrow">
          <Link href="/#panels">Panels</Link>
          {" · "}
          <span data-testid="public-seat-label">Public seat</span>
        </p>
        <h1>{panel.name}</h1>
        <p className="section-lead">
          Opens at {formatUsd(panel.openingUsd)}. Current standing{" "}
          {formatUsd(standing)}.{" "}
          {etchable
            ? `Etchable only at ${formatUsd(GOAL_USD)} buyout.`
            : "Wrap only forever."}
        </p>

        <div className="public-seat-status" data-testid="public-seat-status">
          <p
            className={seatOpen ? "seat-badge seat-open" : "seat-badge seat-held"}
            data-testid="seat-occupancy"
          >
            {seatOpen ? "Seat open" : "Seat held"}
          </p>
          {holder ? (
            <p className="seat-holder" data-testid="seat-holder">
              Standing brand{" "}
              <strong data-testid="public-standing-brand">
                {holder.brandLabel}
              </strong>
              {" · "}
              trade{" "}
              <span data-testid="public-standing-trade">
                {holder.tradeLabel}
              </span>
              {" · "}
              <span data-testid="public-standing-amount">
                {formatUsd(holder.standingUsd)}
              </span>
            </p>
          ) : (
            <p className="seat-holder" data-testid="seat-holder-empty">
              No intent listed yet. Floor for the campaign is {formatUsd(FLOOR_USD)}.
            </p>
          )}
          <p className="auth-hint" data-testid="public-seat-waitlist-cta">
            Want this seat later?{" "}
            <Link href="/#waitlist">Join the waitlist</Link> — still no card
            charge.
          </p>
        </div>

        <HometownLaneTags />

        <TruckViewHotspots
          occupiedPanelIds={occupiedPanelIds}
          activePanelId={panel.id}
          compact
        />

        <PanelMockup
          panel={panel}
          raisedUsd={board.pledgedUsd}
          standingBrand={holder?.brandLabel ?? null}
        />

        {session?.user ? (
          <p className="auth-hint" data-testid="seat-export-png">
            <a
              href={seatExportPngPath(panel.id)}
              data-testid="seat-export-png-link"
            >
              Download seat PNG
            </a>
            {" — preview only. Not charged."}
          </p>
        ) : (
          <p className="auth-hint" data-testid="seat-export-png-signin">
            <Link href={`/signin?callbackUrl=/panels/${panel.id}`}>
              Sign in
            </Link>{" "}
            to download a seat PNG preview. Still no card charge.
          </p>
        )}

        <AdjacentNeighborsCard neighbors={adjacentNeighbors} />
        <NeighborComboCard lot={comboLotFor(panel.id)} />

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
            <dd data-testid="panel-minimum">{formatUsd(minimum)}</dd>
          </div>
          <div>
            <dt>Increment</dt>
            <dd data-testid="panel-increment">
              {seatOpen ? "—" : formatUsd(incrementUsd)}
            </dd>
          </div>
          <div>
            <dt>Deposit shown</dt>
            <dd data-testid="panel-deposit-shown">
              {DEPOSIT_PERCENT}% · {formatUsd(depositUsdForMark(standing))}{" "}
              (not charged)
            </dd>
          </div>
        </dl>
        <p
          className="auth-hint"
          data-testid="opening-bid-rationale"
          data-source="RULES.md"
        >
          {OPENING_BID_RATIONALE}
        </p>
        <p className="auth-hint" data-testid="seat-next-minimum-rule">
          {seatOpen
            ? `Seat open — next minimum is the opening mark ${formatUsd(minimum)}. Still intent only — no card.`
            : `Next minimum is standing + max($250, 10%) = ${formatUsd(minimum)}. Still intent only — no card.`}
        </p>

        <aside
          className="panel-extension"
          data-testid="panel-extended-until"
          data-extended={extensionCopy.isSet ? "true" : "false"}
          data-until={panelExtendedUntil ?? ""}
          aria-labelledby="panel-extension-title"
        >
          <h2 id="panel-extension-title" className="auth-subhead">
            {extensionCopy.heading}
          </h2>
          <p data-testid="panel-extended-until-copy">{extensionCopy.body}</p>
        </aside>

        <p className="intent-banner" data-testid="intent-only-banner">
          Intent only. Amount does not charge. No Stripe capture. No close
          clock.
        </p>

        <aside
          className="seat-exclusivity"
          data-testid="seat-exclusivity"
          aria-labelledby="seat-exclusivity-title"
        >
          <h2 id="seat-exclusivity-title" className="auth-subhead">
            {PUBLIC_COPY.seatExclusivity.heading}
          </h2>
          <p data-testid="seat-exclusivity-body">
            {PUBLIC_COPY.seatExclusivity.body}
          </p>
        </aside>

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

        {session?.user ? (
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
              seatsOpen={resolveSeatsOpen()}
            />
          </section>
        ) : (
          <p className="auth-hint" data-testid="intent-signin-needed">
            <Link href={`/signin?callbackUrl=/panels/${panel.id}`}>
              Sign in
            </Link>{" "}
            to list an intent mark.
          </p>
        )}

        <h2 className="auth-subhead">Standing intents</h2>
        {bids.length === 0 ? (
          <p className="empty-state" data-testid="intent-empty">
            No intents yet. Opening mark is {formatUsd(panel.openingUsd)}.
          </p>
        ) : (
          <ul className="intent-list" data-testid="intent-list">
            {bids.map((bid) => (
              <li
                key={bid.id}
                className="intent-row"
                data-testid={`intent-row-${bid.id}`}
              >
                <div className="intent-row-main">
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
                  {bid.floorSaveUsd != null ? (
                    <span
                      className="auth-hint"
                      data-testid={`intent-floor-save-badge-${bid.id}`}
                    >
                      Floor-save to {formatUsd(bid.floorSaveUsd)} if short of{" "}
                      {formatUsd(FLOOR_USD)} (not charged)
                    </span>
                  ) : (
                    <span className="auth-hint">
                      Deposit shown {formatUsd(bid.depositUsd)} (not charged)
                    </span>
                  )}
                </div>
                <IntentArtworkPreview artworkUrl={bid.artworkUrl} bidId={bid.id} />
              </li>
            ))}
          </ul>
        )}

        <section
          className="public-seat-log"
          aria-labelledby="public-seat-log-title"
          data-testid="public-seat-log"
        >
          <h2 id="public-seat-log-title" className="auth-subhead">
            Seat log
          </h2>
          <p className="auth-hint" data-testid="public-seat-log-lead">
            Public marks on this seat: amount and time only. No bidder email.
            Still not charged.
          </p>
          {seatLog.length === 0 ? (
            <p className="empty-state" data-testid="public-seat-log-empty">
              No marks yet on this seat.
            </p>
          ) : (
            <ol className="seat-log-list" data-testid="public-seat-log-list">
              {seatLog.map((entry) => (
                <li
                  key={entry.bidId}
                  className="seat-log-row"
                  data-testid={`seat-log-row-${entry.bidId}`}
                >
                  <span
                    className="intent-mark"
                    data-testid={`seat-log-amount-${entry.bidId}`}
                  >
                    {entry.amountLabel}
                  </span>
                  <time
                    dateTime={entry.createdAt}
                    data-testid={`seat-log-time-${entry.bidId}`}
                  >
                    {entry.timeLabel}
                  </time>
                  <span
                    className="auth-hint"
                    data-testid={`seat-log-brand-${entry.bidId}`}
                  >
                    {entry.brandLabel}
                  </span>
                  <span className={intentStatusClass(entry.status)}>
                    {intentStatusLabel(entry.status)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </>
  );
}
