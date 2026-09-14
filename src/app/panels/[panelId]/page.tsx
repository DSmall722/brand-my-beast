import Link from "next/link";
import { notFound } from "next/navigation";
import { IntentBidForm } from "@/components/IntentBidForm";
import { auth } from "@/lib/auth";
import { PANELS, formatUsd, isEtchable } from "@/lib/campaign";
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

  return (
    <main className="shell auth-page" data-testid="panel-intent-page">
      <p className="eyebrow">
        <Link href="/#panels">Panels</Link>
      </p>
      <h1>{panel.name}</h1>
      <p className="section-lead">
        Opens at {formatUsd(panel.openingUsd)}. Current standing{" "}
        {formatUsd(standing)}.{" "}
        {isEtchable(panel)
          ? "Etchable at $120,000 buyout."
          : "Wrap only forever."}
      </p>
      <p className="auth-hint" data-testid="intent-only-banner">
        Intent only. No Stripe capture. No close clock.
      </p>

      {session?.user ? (
        <IntentBidForm panelId={panel.id} minimumUsd={minimum} />
      ) : (
        <p className="auth-hint" data-testid="intent-signin-needed">
          <Link href={`/signin?callbackUrl=/panels/${panel.id}`}>Sign in</Link>{" "}
          to list an intent mark.
        </p>
      )}

      <h2 className="auth-subhead">Standing intents</h2>
      {bids.length === 0 ? (
        <p className="auth-hint" data-testid="intent-empty">
          No intents yet. Opening mark is {formatUsd(panel.openingUsd)}.
        </p>
      ) : (
        <ul className="intent-list" data-testid="intent-list">
          {bids.map((bid) => (
            <li key={bid.id} data-testid={`intent-row-${bid.id}`}>
              <strong>{bid.brandLabel}</strong> — {formatUsd(bid.standingUsd)}{" "}
              <span className="badge">{bid.status}</span>
              <span className="auth-hint">
                {" "}
                deposit shown {formatUsd(bid.depositUsd)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
