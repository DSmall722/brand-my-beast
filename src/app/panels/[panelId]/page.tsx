import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdjacentNeighborsCard,
} from "@/components/AdjacentClashHint";
import { HometownLaneTags } from "@/components/HometownLaneTags";
import { IntentArtworkPreview } from "@/components/IntentArtworkPreview";
import { IntentBidForm } from "@/components/IntentBidForm";
import { NeighborComboCard } from "@/components/NeighborComboCard";
import { PanelMockup } from "@/components/PanelMockup";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { DEPOSIT_PERCENT, FLOOR_USD, GOAL_USD, PANELS, formatUsd, isEtchable } from "@/lib/campaign";
import { comboLotFor } from "@/lib/combo-lots";
import { intentStatusClass, intentStatusLabel } from "@/lib/intent-labels";
import {
  listBidsForPanel,
  loadBoardIntentStats,
  loadStandingHoldersByPanel,
  minimumIntentUsd,
  standingForPanel,
} from "@/lib/intent-store";
import {
  holdersOnAdjacentPanels,
  type AdjacentSeatHolder,
} from "@/lib/panel-clash";

type Params = Promise<{ panelId: string }>;

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
  const etchable = isEtchable(panel);
  const viewerId = session?.user?.id;
  const viewerWasOutbid = Boolean(
    viewerId &&
      bids.some(
        (bid) => bid.userId === viewerId && bid.status === "outbid",
      ),
  );
  const holder = bids.find(
    (bid) => bid.status === "listed" || bid.status === "approved",
  );
  const seatOpen = !holder;

  return (
    <>
      <SiteChrome />
      <main
        className="shell auth-page panel-intent public-seat"
        data-testid="panel-intent-page"
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

        <PanelMockup panel={panel} raisedUsd={board.pledgedUsd} />

        <AdjacentNeighborsCard neighbors={adjacentNeighbors} />
        <NeighborComboCard lot={comboLotFor(panel.id)} />

        <dl className="panel-stats" data-testid="panel-stats">
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
            <dt>Deposit shown</dt>
            <dd data-testid="panel-deposit-shown">
              {DEPOSIT_PERCENT}% (not charged)
            </dd>
          </div>
        </dl>

        <p className="intent-banner" data-testid="intent-only-banner">
          Intent only. Amount does not charge. No Stripe capture. No close
          clock.
        </p>

        {viewerWasOutbid ? (
          <p
            className="failed-winner-banner"
            data-testid="failed-winner-waitlist"
          >
            You were outbid on this panel. Stay on the{" "}
            <Link href="/#waitlist">waitlist</Link> for a second look if this
            seat opens — still no card charge. Or list a higher intent mark
            below.
          </p>
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
                  <span className="auth-hint">
                    Deposit shown {formatUsd(bid.depositUsd)} (not charged)
                  </span>
                </div>
                <IntentArtworkPreview artworkUrl={bid.artworkUrl} bidId={bid.id} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
