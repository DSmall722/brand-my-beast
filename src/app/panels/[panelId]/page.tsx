import Link from "next/link";
import { notFound } from "next/navigation";
import { IntentBidForm } from "@/components/IntentBidForm";
import { PanelMockup } from "@/components/PanelMockup";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { DEPOSIT_PERCENT, PANELS, formatUsd, isEtchable } from "@/lib/campaign";
import { intentStatusClass, intentStatusLabel } from "@/lib/intent-labels";
import {
  listBidsForPanel,
  minimumIntentUsd,
  standingForPanel,
} from "@/lib/intent-store";

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
  const etchable = isEtchable(panel);
  const viewerId = session?.user?.id;
  const viewerWasOutbid = Boolean(
    viewerId &&
      bids.some(
        (bid) => bid.userId === viewerId && bid.status === "outbid",
      ),
  );

  return (
    <>
      <SiteChrome />
      <main
        className="shell auth-page panel-intent"
        data-testid="panel-intent-page"
      >
        <p className="eyebrow">
          <Link href="/#panels">Panels</Link>
        </p>
        <h1>{panel.name}</h1>
        <p className="section-lead">
          Opens at {formatUsd(panel.openingUsd)}. Current standing{" "}
          {formatUsd(standing)}.{" "}
          {etchable ? "Etchable at $120,000 buyout." : "Wrap only forever."}
        </p>

        <PanelMockup panel={panel} />

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
            <dd>{DEPOSIT_PERCENT}%</dd>
          </div>
        </dl>

        <p className="intent-banner" data-testid="intent-only-banner">
          Intent only. No Stripe capture. No close clock.
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
            <IntentBidForm panelId={panel.id} minimumUsd={minimum} />
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
                  <strong className="intent-brand">{bid.brandLabel}</strong>
                  <span className="intent-trade" data-testid={`intent-trade-${bid.id}`}>
                    {bid.tradeLabel}
                  </span>
                  <span className="intent-mark">
                    {formatUsd(bid.standingUsd)}
                  </span>
                </div>
                <div className="intent-row-meta">
                  <span className={intentStatusClass(bid.status)}>
                    {intentStatusLabel(bid.status)}
                  </span>
                  <span className="auth-hint">
                    Deposit shown {formatUsd(bid.depositUsd)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
